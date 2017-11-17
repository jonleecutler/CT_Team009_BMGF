using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;

using CicoService.Storage;
using CicoService.Vision;
using CicoService.Controllers.Contracts;

namespace CicoService.Controllers
{
    [Route("api/[controller]")]
    public class RequestsController : Controller
    {
        private readonly StorageProvider storageProvider;
        private readonly VisionProvider visionProvider;

        public RequestsController(IConfiguration config)
        {
            this.storageProvider = new StorageProvider(config.GetConnectionString("cicostorage"));
            this.visionProvider = new VisionProvider(config.GetConnectionString("googlevision"));
        }

        // GET: api/requests
        [HttpGet]
        public async Task<IActionResult> Get([FromQuery]string type)
        {
            if (string.IsNullOrWhiteSpace(type))
            {
                return BadRequest();
            }

            var requestType = type.Equals("withdraw", StringComparison.OrdinalIgnoreCase)
                  ? Storage.Contracts.RequestType.Withdraw
                  : type.Equals("deposit", StringComparison.OrdinalIgnoreCase)
                  ? Storage.Contracts.RequestType.Deposit
                  : Storage.Contracts.RequestType.Unknown;

            if (requestType == Storage.Contracts.RequestType.Unknown)
            {
                return BadRequest();
            }

            var requestEntities = await this.storageProvider.RetrieveRequests(requestType);
            var requests = requestEntities.Select(re => new Request()
            {
                Currency = re.Currency,
                Amount = decimal.Parse(re.Amount),
                Type = ((Storage.Contracts.RequestType)re.Type).ToString()
            });

            return Json(requests);
        }

        // POST api/requests/verify
        [HttpPost]
        [Route("verify")]
        public async Task<IActionResult> PostVerify([FromBody]Verify verify)
        {
            // Get the deposit and withdraw requests
            var depositRequest = await this.storageProvider.RetrieveRequest(verify.DepositId);
            var withdrawRequest = await this.storageProvider.RetrieveRequest(verify.WithdrawId);

            // Get the matched users
            var depositUser = await this.storageProvider.RetrieveUser(depositRequest.UserId);
            var withdrawUser = await this.storageProvider.RetrieveUser(withdrawRequest.UserId);

            var annotatedImage = await this.visionProvider.AnnotateImage(verify.Image);
            annotatedImage.Analyze();

            if (!annotatedImage.IsCash)
            {
                return BadRequest("The image is not cash.");
            }

            if (!annotatedImage.IsParsed)
            {
                return BadRequest("The serial number did not parsed correcty.");
            }

            if (!annotatedImage.SerialNumber.Equals(depositRequest.SerialNumber))
            {
                return Unauthorized();
            }

            // Cleanup the completed requests
            await this.storageProvider.DeleteRequest(depositRequest);
            await this.storageProvider.DeleteRequest(withdrawRequest);

            return Json(new Details()
            {
                UserId = withdrawUser.PartitionKey,
                UserName = withdrawUser.Name,
                UserAddress = withdrawUser.Address,
                UserImageUri = withdrawUser.ImageUri,

                MatchUserId = depositUser.PartitionKey,
                MatchUserName = depositUser.Name,
                MatchUserAddress = depositUser.Address,
                MatchUserImageUri = depositUser.ImageUri,

                DepositId = depositRequest.PartitionKey,
                WithdrawId = withdrawRequest.PartitionKey,
                Currency = withdrawRequest.Currency,
                Amount = decimal.Parse(withdrawRequest.Amount),
                SerialNumber = annotatedImage.SerialNumber,
            });
        }

        // POST api/requests
        [HttpPost]
        public async Task<IActionResult> PostCreate([FromBody]Request request)
        {
            if (request == null)
            {
                return BadRequest();
            }

            var requestType = request.Type.Equals("withdraw", StringComparison.OrdinalIgnoreCase)
                  ? Storage.Contracts.RequestType.Withdraw
                  : request.Type.Equals("deposit", StringComparison.OrdinalIgnoreCase)
                  ? Storage.Contracts.RequestType.Deposit
                  : Storage.Contracts.RequestType.Unknown;

            switch (requestType)
            {
                case Storage.Contracts.RequestType.Deposit:
                    return await CreateDepost(request);

                case Storage.Contracts.RequestType.Withdraw:
                    return await CreateWithdraw(request);

                default:
                    return BadRequest("Unknown request type.");
            }
        }

        private async Task<IActionResult> CreateDepost(Request request)
        {
            var annotatedImage = await this.visionProvider.AnnotateImage(request.Image);
            annotatedImage.Analyze();

            if (!annotatedImage.IsCash)
            {
                return BadRequest("The image is not cash.");
            }

            if (!annotatedImage.IsParsed)
            {
                return BadRequest("The serial number did not parsed correcty.");
            }

            // Create the new depost request
            await this.storageProvider.CreateRequest(
                request.UserId,
                request.Currency,
                request.Amount,
                annotatedImage.SerialNumber,
                Storage.Contracts.RequestType.Deposit);

            return Ok();
        }

        private async Task<IActionResult> CreateWithdraw(Request request)
        {
            // Create the new withdraw request
            var withdrawId = await this.storageProvider.CreateRequest(
                request.UserId,
                request.Currency,
                request.Amount,
                null,
                Storage.Contracts.RequestType.Withdraw);

            // Look for pending deposits in the system
            var pendingDeposits = await this.storageProvider.RetrieveRequests(Storage.Contracts.RequestType.Deposit);

            // Take the first or default deposit from the system
            var matchingDepost = pendingDeposits.FirstOrDefault();
            if (matchingDepost == null)
            {
                return Ok();
            }

            // Get the matched users
            var currentUser = await this.storageProvider.RetrieveUser(request.UserId);
            var matchUser = await this.storageProvider.RetrieveUser(matchingDepost.UserId);

            return Json(new Details()
            {
                UserId = currentUser.PartitionKey,
                UserName = currentUser.Name,
                UserAddress = currentUser.Address,
                UserImageUri = currentUser.ImageUri,

                MatchUserId = matchUser.PartitionKey,
                MatchUserName = matchUser.Name,
                MatchUserAddress = matchUser.Address,
                MatchUserImageUri = matchUser.ImageUri,

                DepositId = matchingDepost.PartitionKey,
                WithdrawId = withdrawId,
                Currency = request.Currency,
                Amount = request.Amount,
                SerialNumber = matchingDepost.SerialNumber,
            });
        }
    }
}
