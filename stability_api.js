/**
 * Stability AI API Integration Module
 * Provides text-to-image generation functionality using Stability AI API
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

class StabilityAI {
    constructor(apiKey, outputDir) {
        this.apiKey = apiKey;
        this.outputDir = outputDir || './uploads/stability';
        this.baseUrl = 'https://api.stability.ai';
        this.engineId = 'stable-diffusion-xl-1024-v1-0'; // Default engine
        
        // Available style presets
        this.stylePresets = [
            'photographic', 'digital-art', 'anime', 'cinematic', 'painting',
            'pixel-art', 'fantasy-art', 'line-art', 'analog-film', 'neon-punk',
            'isometric', 'low-poly', 'origami', 'modeling-compound', '3d-model'
        ];
        
        // Ensure output directory exists
        if (!fs.existsSync(this.outputDir)) {
            fs.mkdirSync(this.outputDir, { recursive: true });
        }
    }

    /**
     * Generate an image from text prompt using Stability AI
     * @param {string} prompt - The text description of the image to generate
     * @param {Object} options - Additional options for image generation
     * @returns {Promise<string>} - Path to the generated image
     */
    async generateImage(prompt, options = {}) {
        if (!this.apiKey) {
            throw new Error('Stability API key is not configured');
        }

        const defaultOptions = {
            width: 1024,
            height: 1024,
            cfg_scale: 7,
            steps: 30,
            samples: 1,
            style_preset: 'photographic',
            negative_prompt: ''
        };

        const settings = { ...defaultOptions, ...options };

        try {
            const response = await axios({
                method: 'post',
                url: `${this.baseUrl}/v1/generation/${this.engineId}/text-to-image`,
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                data: {
                    text_prompts: [
                        {
                            text: prompt,
                            weight: 1
                        },
                        ...(settings.negative_prompt ? [
                            {
                                text: settings.negative_prompt,
                                weight: -1
                            }
                        ] : [])
                    ],
                    cfg_scale: settings.cfg_scale,
                    height: settings.height,
                    width: settings.width,
                    samples: settings.samples,
                    steps: settings.steps,
                    style_preset: settings.style_preset
                }
            });

            // Process and save images
            const images = [];
            for (const image of response.data.artifacts) {
                const fileName = `stability_${uuidv4()}.png`;
                const filePath = path.join(this.outputDir, fileName);
                
                // Save the image
                const buffer = Buffer.from(image.base64, 'base64');
                fs.writeFileSync(filePath, buffer);
                
                images.push({
                    path: filePath,
                    seed: image.seed,
                    fileName: fileName
                });
            }

            return images.length === 1 ? images[0] : images;
        } catch (error) {
            console.error('Stability AI Error:', error.response?.data || error.message);
            throw new Error(`Failed to generate image: ${error.response?.data?.message || error.message}`);
        }
    }

    /**
     * Get available engines from Stability AI
     * @returns {Promise<Array>} - List of available engines
     */
    async getEngines() {
        try {
            const response = await axios({
                method: 'get',
                url: `${this.baseUrl}/v1/engines/list`,
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`
                }
            });
            
            return response.data;
        } catch (error) {
            console.error('Failed to get engines:', error.response?.data || error.message);
            throw new Error(`Failed to get engines: ${error.response?.data?.message || error.message}`);
        }
    }

    /**
     * Set the engine to use for image generation
     * @param {string} engineId - The ID of the engine to use
     */
    setEngine(engineId) {
        this.engineId = engineId;
    }

    /**
     * Get the list of available style presets
     * @returns {Array<string>} - List of style preset names
     */
    getStylePresets() {
        return this.stylePresets;
    }

    /**
     * Check if a style preset is valid
     * @param {string} style - The style preset to check
     * @returns {boolean} - True if the style preset is valid
     */
    isValidStylePreset(style) {
        return this.stylePresets.includes(style);
    }
}

module.exports = StabilityAI;