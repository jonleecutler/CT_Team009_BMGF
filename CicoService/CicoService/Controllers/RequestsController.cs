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
                  : type.Equals("depost", StringComparison.OrdinalIgnoreCase)
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

        // POST api/requests
        [HttpPost]
        public async Task<IActionResult> Post([FromBody]Request request)
        {
            if (request == null)
            {
                return BadRequest();
            }

            var requestType = request.Type.Equals("withdraw", StringComparison.OrdinalIgnoreCase)
                  ? Storage.Contracts.RequestType.Withdraw
                  : request.Type.Equals("depost", StringComparison.OrdinalIgnoreCase)
                  ? Storage.Contracts.RequestType.Deposit
                  : Storage.Contracts.RequestType.Unknown;

            if (requestType == Storage.Contracts.RequestType.Unknown)
            {
                return BadRequest();
            }

            //var annotateImageResponse = await this.visionProvider.AnnotateImage(request.Image);

            var requestId = await this.storageProvider.CreateRequest(request.Currency, request.Amount, requestType);

            return Ok(requestId);
        }

        // DELETE api/requests/{id}
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            // Placeholder
            await Task.FromResult(true);

            // TODO: implement
            return NotFound();
        }
    }
}
