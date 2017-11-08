using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;

using CicoService.Storage;

namespace CicoService.Controllers
{
    [Route("api/[controller]")]
    public class RequestsController : Controller
    {
        private readonly StorageProvider storageProvider;

        public RequestsController(IConfiguration config)
        {
            this.storageProvider = new StorageProvider(config.GetConnectionString("cicostorage"));
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
        public async Task<IActionResult> Post([FromBody]string value)
        {
            // Placeholder
            await Task.FromResult(true);

            // TODO: implement
            return NotFound();
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
