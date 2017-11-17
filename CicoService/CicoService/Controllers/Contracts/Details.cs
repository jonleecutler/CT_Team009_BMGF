using Newtonsoft.Json;

namespace CicoService.Controllers.Contracts
{
    public class Details
    {
        // Properties of the current user

        [JsonProperty(PropertyName = "userId")]
        public string UserId { get; set; }

        [JsonProperty(PropertyName = "userName")]
        public string UserName { get; set; }

        [JsonProperty(PropertyName = "userAddress")]
        public string UserAddress { get; set; }

        [JsonProperty(PropertyName = "userImageUri")]
        public string UserImageUri { get; set; }

        // Properties of the match user

        [JsonProperty(PropertyName = "matchUserId")]
        public string MatchUserId { get; set; }

        [JsonProperty(PropertyName = "matchUserName")]
        public string MatchUserName { get; set; }

        [JsonProperty(PropertyName = "matchUserAddress")]
        public string MatchUserAddress { get; set; }

        [JsonProperty(PropertyName = "matchUserImageUri")]
        public string MatchUserImageUri { get; set; }

        // Properties of the transaction

        [JsonProperty(PropertyName = "depositId")]
        public string DepositId { get; set; }

        [JsonProperty(PropertyName = "withdrawId")]
        public string WithdrawId { get; set; }

        [JsonProperty(PropertyName = "currency")]
        public string Currency { get; set; }

        [JsonProperty(PropertyName = "amount")]
        public decimal Amount { get; set; }

        [JsonProperty(PropertyName = "serialNumber")]
        public string SerialNumber { get; set; }
    }
}
