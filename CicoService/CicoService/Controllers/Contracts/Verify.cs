using System;
using Newtonsoft.Json;

namespace CicoService.Controllers.Contracts
{
    public class Verify
    {
        [JsonProperty(PropertyName = "depositId")]
        public string DepositId { get; set; }

        [JsonProperty(PropertyName = "withdrawId")]
        public string WithdrawId { get; set; }

        [JsonProperty(PropertyName = "image")]
        public string Image { get; set; }
    }
}
