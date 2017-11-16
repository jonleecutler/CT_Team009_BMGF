using System.Collections.Generic;
using System.Threading.Tasks;

using Google;
using Google.Apis.Auth.OAuth2;
using Google.Apis.Services;
using Google.Apis.Vision.v1;
using Google.Apis.Vision.v1.Data;

namespace CicoService.Vision
{
    public class VisionProvider
    {
        private const string LabelDetectionFeature = "LABEL_DETECTION";
        private const string TextDetectionFeature = "TEXT_DETECTION";
        private const string SafeSearchDetectionFeature = "SAFE_SEARCH_DETECTION";
        private const string FaceDetectionFeature = "FACE_DETECTION";
        private const string LandmarkDetectionFeature = "LANDMARK_DETECTION";
        private const string LogoDetectionFeature = "LOGO_DETECTION";
        private const string ImagePropertiesFeature = "IMAGE_PROPERTIES";

        private readonly VisionService visionService;

        private static List<Feature> RequestFeatures = new List<Feature>()
        {
            new Feature() { Type = LabelDetectionFeature },
            new Feature() { Type = TextDetectionFeature },
        };

        public VisionProvider(string connectionString)
        {
            var credential = GoogleCredential.FromJson(connectionString).CreateScoped(VisionService.Scope.CloudPlatform);

            this.visionService = new VisionService(new BaseClientService.Initializer()
            {
                HttpClientInitializer = credential,
                ApplicationName = "GV Service Account",
            });
        }

        public async Task<AnnotatedImage> AnnotateImage(string image)
        {
            var request = new AnnotateImageRequest
            {
                Image = new Image(),
            };

            request.Image.Content = image;
            request.Features = RequestFeatures;

            var batchRequest = new BatchAnnotateImagesRequest
            {
                Requests = new List<AnnotateImageRequest>(),
            };

            batchRequest.Requests.Add(request);

            BatchAnnotateImagesResponse response;
            try
            {
                response = await this.visionService.Images.Annotate(batchRequest).ExecuteAsync();
            }
            catch (GoogleApiException ex)
            {
                var e = ex;
                //ex.HttpStatusCode
                //ex.Error.Code
                //ex.Error.Message

                throw;
            }

            return response.Responses.Count > 0
               ? new AnnotatedImage(response.Responses[0])
               : null;
        }
    }
}
