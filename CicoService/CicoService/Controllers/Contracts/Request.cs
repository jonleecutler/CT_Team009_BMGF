using System;
using Newtonsoft.Json;

namespace CicoService.Controllers.Contracts
{
    public class Request
    {
        [JsonProperty(PropertyName = "currency")]
        public string Currency { get; set; }

        [JsonProperty(PropertyName = "amount")]
        public decimal Amount { get; set; }

        [JsonProperty(PropertyName = "type")]
        public string Type { get; set; }

        [JsonProperty(PropertyName = "image")]
        public string Image { get; set; }
    }
}
