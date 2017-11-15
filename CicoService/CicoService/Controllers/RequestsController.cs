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
        public async Task<IActionResult> Get()
        {
            // Placeholder
            await Task.FromResult(true);

            // TODO: implement
            return NotFound();
        }

        // GET api/requests/{id}
        [HttpGet("{id}")]
        public async Task<IActionResult> Get(int id)
        {
            // Placeholder
            await Task.FromResult(true);

            // TODO: implement
            return NotFound();
        }

        // POST api/requests
        [HttpPost]
        public async Task<IActionResult> Post([FromBody]Request request)
        {
            var annotateImageResponse = await this.visionProvider.AnnotateImage(request.Image);

            // TODO: implement
            return Json(annotateImageResponse);
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
