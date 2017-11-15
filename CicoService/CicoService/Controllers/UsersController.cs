using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;

using CicoService.Controllers.Contracts;
using CicoService.Storage;

namespace CicoService.Controllers
{
    [Route("api/[controller]")]
    public class UsersController : Controller
    {
        private readonly StorageProvider storageProvider;

        public UsersController(IConfiguration config)
        {
            this.storageProvider = new StorageProvider(config.GetConnectionString("cicostorage"));
        }

        // GET api/users/{id}
        [HttpGet("{id}")]
        public async Task<IActionResult> Get(string id)
        {
            if (string.IsNullOrWhiteSpace(id))
            {
                return BadRequest();
            }

            var userEntity = await this.storageProvider.RetrieveUser(id);
            if (userEntity == null)
            {
                return NotFound();
            }

            return Json(new User()
            {
                Id = userEntity.RowKey,
                FirstName = userEntity.FirstName,
                LastName = userEntity.LastName
            });
        }

        // POST api/users
        [HttpPost]
        public async Task<IActionResult> Post([FromBody]User user)
        {
            if (user == null)
            {
                return BadRequest();
            }

            await this.storageProvider.CreateUser(user.Id, user.FirstName, user.LastName);

            return Ok();
        }

        // PUT api/users/{id}
        [HttpPut("{id}")]
        public async Task<IActionResult> Put(int id, [FromBody]string value)
        {
            // Placeholder
            await Task.FromResult(true);

            // TODO: implement
            return NotFound();
        }

        // DELETE api/users/{id}
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
