using System;
using System.Text;
using System.Collections.Generic;
using System.Text.RegularExpressions;

using Google.Apis.Vision.v1.Data;

namespace CicoService.Vision
{
    public class AnnotatedImage
    {
        private readonly AnnotateImageResponse annotateImageResponse;

        private static Regex SerialNumberRegex = new Regex(@"[A-Z]{1}[0-9]{8}[A-Z]{1}", RegexOptions.Compiled);

        private static Dictionary<char, char> CharacterMappings = new Dictionary<char, char>()
        {
            { 'し', 'L' },
        };

        private const double ConfidenceThreshold = 0.75;

        private static HashSet<string> ImageLabels = new HashSet<string>()
        {
            "cash",
            "currency",
            "paper",
            "money",
            "dollar",
            "bill",
        };

        public bool IsCash { get; private set; }

        public bool IsParsed { get; private set; }

        public string SerialNumber { get; private set; }

        public AnnotatedImage(AnnotateImageResponse annotateImageResponse)
        {
            if (annotateImageResponse == null)
            {
                throw new ArgumentNullException(nameof(annotateImageResponse));
            }

            this.annotateImageResponse = annotateImageResponse;
        }

        public void Analyze()
        {
            // Check if the image is of cash
            foreach (var label in annotateImageResponse.LabelAnnotations)
            {
                // Match labels with confidence threshold
                if (ImageLabels.Contains(label.Description.ToLower()) &&
                    label.Score >= ConfidenceThreshold)
                {
                    this.IsCash = true;
                    break;
                }
            }

            // If the image is not cash return without further processing
            if (!this.IsCash)
            {
                return;
            }

            // Get the full text annotation
            var text = annotateImageResponse.FullTextAnnotation.Text;

            // Remove all whitespace from the text
            text = Regex.Replace(text, @"\s+", "");

            // Remove all punctuation from the text
            text = Regex.Replace(text, @"[!.,?]+", "");

            // Replace all incorrectly processed characters
            var textChars = text.ToCharArray();
            for (int i = 0; i < textChars.Length; i++)
            {
                var currentChar = textChars[i];

                if (CharacterMappings.ContainsKey(currentChar))
                {
                    textChars[i] = CharacterMappings[currentChar];
                }
            }

            text = new string(textChars);

            var serialMatches = SerialNumberRegex.Matches(text);

            this.IsParsed = serialMatches.Count > 0;
            this.SerialNumber = serialMatches[serialMatches.Count - 1].Value;
        }
    }
}
