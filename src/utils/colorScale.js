"use strict";

class Color {
    constructor(red, green, blue) {
        this.set(red, green, blue);
    }

    toString() {
        return `rgb(${Math.round(this.r)}, ${Math.round(this.g)}, ${Math.round(this.b)})`;
    }

    set(red, green, blue) {
        this.r = this.clamp(red);
        this.g = this.clamp(green);
        this.b = this.clamp(blue);
    }

    hueRotate(degrees = 0) {
        degrees = degrees / 180 * Math.PI;
        const sinHue = Math.sin(degrees);
        const cosHue = Math.cos(degrees);
        this.multiply([
            0.213 + cosHue * 0.787 - sinHue * 0.213, 
            0.715 - cosHue * 0.715 - sinHue * 0.715, 
            0.072 - cosHue * 0.072 + sinHue * 0.928, 
            0.213 - cosHue * 0.213 + sinHue * 0.143, 
            0.715 + cosHue * 0.285 + sinHue * 0.14, 
            0.072 - cosHue * 0.072 - sinHue * 0.283, 
            0.213 - cosHue * 0.213 - sinHue * 0.787, 
            0.715 - cosHue * 0.715 + sinHue * 0.715, 
            0.072 + cosHue * 0.928 + sinHue * 0.072
        ]);
    }

    grayscale(opacity = 1) {
        this.multiply([
            0.2126 + 0.7874 * (1 - opacity), 
            0.7152 - 0.7152 * (1 - opacity), 
            0.0722 - 0.0722 * (1 - opacity), 
            0.2126 - 0.2126 * (1 - opacity), 
            0.7152 + 0.2848 * (1 - opacity), 
            0.0722 - 0.0722 * (1 - opacity), 
            0.2126 - 0.2126 * (1 - opacity), 
            0.7152 - 0.7152 * (1 - opacity), 
            0.0722 + 0.9278 * (1 - opacity)
        ]);
    }

    sepia(opacity = 1) {
        this.multiply([
            0.393 + 0.607 * (1 - opacity), 
            0.769 - 0.769 * (1 - opacity), 
            0.189 - 0.189 * (1 - opacity), 
            0.349 - 0.349 * (1 - opacity), 
            0.686 + 0.314 * (1 - opacity), 
            0.168 - 0.168 * (1 - opacity), 
            0.272 - 0.272 * (1 - opacity), 
            0.534 - 0.534 * (1 - opacity), 
            0.131 + 0.869 * (1 - opacity)
        ]);
    }

    saturate(opacity = 1) {
        this.multiply([
            0.213 + 0.787 * opacity, 
            0.715 - 0.715 * opacity, 
            0.072 - 0.072 * opacity, 
            0.213 - 0.213 * opacity, 
            0.715 + 0.285 * opacity, 
            0.072 - 0.072 * opacity, 
            0.213 - 0.213 * opacity, 
            0.715 - 0.715 * opacity, 
            0.072 + 0.928 * opacity
        ]);
    }

    multiply(matrix) {
        const newRed = this.clamp(this.r * matrix[0] + this.g * matrix[1] + this.b * matrix[2]);
        const newGreen = this.clamp(this.r * matrix[3] + this.g * matrix[4] + this.b * matrix[5]);
        const newBlue = this.clamp(this.r * matrix[6] + this.g * matrix[7] + this.b * matrix[8]);
        this.r = newRed;
        this.g = newGreen;
        this.b = newBlue;
    }

    brightness(opacity = 1) {
        this.linear(opacity);
    }

    contrast(opacity = 1) {
        this.linear(opacity, -(0.5 * opacity) + 0.5);
    }

    linear(opacity = 1, offset = 0) {
        this.r = this.clamp(this.r * opacity + offset * 255);
        this.g = this.clamp(this.g * opacity + offset * 255);
        this.b = this.clamp(this.b * opacity + offset * 255);
    }

    invert(opacity = 1) {
        this.r = this.clamp((opacity + this.r / 255 * (1 - 2 * opacity)) * 255);
        this.g = this.clamp((opacity + this.g / 255 * (1 - 2 * opacity)) * 255);
        this.b = this.clamp((opacity + this.b / 255 * (1 - 2 * opacity)) * 255);
    }

    hsl() {
        const red = this.r / 255;
        const green = this.g / 255;
        const blue = this.b / 255;
        const maxColor = Math.max(red, green, blue);
        const minColor = Math.min(red, green, blue);
        let hue, saturation, lightness = (maxColor + minColor) / 2;

        if (maxColor === minColor) {
            hue = saturation = 0; // Acromatic
        } else {
            const chroma = maxColor - minColor;
            saturation = lightness > 0.5 ? chroma / (2 - maxColor - minColor) : chroma / (maxColor + minColor);
            switch (maxColor) {
                case red:
                    hue = (green - blue) / chroma + (green < blue ? 6 : 0);
                    break;
                case green:
                    hue = (blue - red) / chroma + 2;
                    break;
                case blue:
                    hue = (red - green) / chroma + 4;
                    break;
            }
            hue /= 6;
        }

        return {
            h: hue * 100,
            s: saturation * 100,
            l: lightness * 100
        };
    }

    clamp(value) {
        if (value > 255) {
            value = 255;
        } else if (value < 0) {
            value = 0;
        }
        return value;
    }
}

class ColorSolver {
    constructor(targetColor) {
        this.targetColor = targetColor;
        this.targetHSL = targetColor.hsl();
        this.reusedColor = new Color(0, 0, 0);
    }

    solve() {
        const narrowSolution = this.narrowSearch(this.wideSearch());
        return {
            values: narrowSolution.values,
            loss: narrowSolution.loss,
            filter: this.generateCSSFilter(narrowSolution.values)
        };
    }

    wideSearch() {
        const maxIteration = 5;
        const maxRange = 15;
        const params = [60, 180, 18000, 600, 1.2, 1.2];
        let bestSolution = { loss: Infinity };

        for (let attempt = 0; bestSolution.loss > 25 && attempt < 3; attempt++) {
            const initialGuesses = [50, 20, 3750, 50, 100, 100];
            const currentSolution = this.performSPSA(maxIteration, params, maxRange, initialGuesses, 1000);
            if (currentSolution.loss < bestSolution.loss) {
                bestSolution = currentSolution;
            }
        }
        return bestSolution;
    }

    narrowSearch(wideSolution) {
        const currentLoss = wideSolution.loss;
        const narrowIterations = 2;
        const lossThreshold = currentLoss + 1;
        const perturbationFactors = [
            0.25 * lossThreshold, 
            0.25 * lossThreshold, 
            lossThreshold, 
            0.25 * lossThreshold, 
            0.2 * lossThreshold, 
            0.2 * lossThreshold
        ];
        return this.performSPSA(currentLoss, perturbationFactors, narrowIterations, wideSolution.values, 500);
    }

    performSPSA(lossValue, adjustmentFactors, controlParameter, currentValues, maxIterations) {
        let noise = 1;
        const decay = 0.16666666666666666;
        let optimizedValues = null;
        let minimumLoss = Infinity;
        const signs = new Array(6);
        const perturbedPlus = new Array(6);
        const perturbedMinus = new Array(6);

        for (let iteration = 0; iteration < maxIterations; iteration++) {
            const perturbation = controlParameter / Math.pow(iteration + 1, decay);
            for (let idx = 0; idx < 6; idx++) {
                signs[idx] = Math.random() > 0.5 ? 1 : -1;
                perturbedPlus[idx] = currentValues[idx] + perturbation * signs[idx];
                perturbedMinus[idx] = currentValues[idx] - perturbation * signs[idx];
            }
            const lossDiff = this.calculateLoss(perturbedPlus) - this.calculateLoss(perturbedMinus);
            for (let idx = 0; idx < 6; idx++) {
                const gradientApproximation = lossDiff / (2 * perturbation) * signs[idx];
                const stepSize = adjustmentFactors[idx] / Math.pow(lossValue + iteration + 1, noise);
                currentValues[idx] = boundValue(currentValues[idx] - stepSize * gradientApproximation, idx);
            }
            const currentLoss = this.calculateLoss(currentValues);
            if (currentLoss < minimumLoss) {
                optimizedValues = currentValues.slice(0);
                minimumLoss = currentLoss;
            }
        }
        return {
            values: optimizedValues,
            loss: minimumLoss
        };

        function boundValue(value, index) {
            let upperLimit = 100;
            if (index === 2) {
                upperLimit = 7500;
            } else if (index === 4 || index === 5) {
                upperLimit = 200;
            }
            if (index === 3) {
                if (value > upperLimit) {
                    value %= upperLimit;
                } else if (value < 0) {
                    value = upperLimit + value % upperLimit;
                }
            } else {
                if (value < 0) {
                    value = 0;
                } else if (value > upperLimit) {
                    value = upperLimit;
                }
            }
            return value;
        }
    }

    calculateLoss(values) {
        const tempColor = this.reusedColor;
        tempColor.set(0, 0, 0);
        tempColor.invert(values[0] / 100);
        tempColor.sepia(values[1] / 100);
        tempColor.saturate(values[2] / 100);
        tempColor.hueRotate(values[3] * 3.6);
        tempColor.brightness(values[4] / 100);
        tempColor.contrast(values[5] / 100);
        const computedHSL = tempColor.hsl();
        
        return (
            Math.abs(tempColor.r - this.targetColor.r) +
            Math.abs(tempColor.g - this.targetColor.g) +
            Math.abs(tempColor.b - this.targetColor.b) +
            Math.abs(computedHSL.h - this.targetHSL.h) +
            Math.abs(computedHSL.s - this.targetHSL.s) +
            Math.abs(computedHSL.l - this.targetHSL.l)
        );
    }

    generateCSSFilter(values) {
        const roundNumber = (index, multiplier = 1) => Math.round(values[index] * multiplier);
        return `invert(${roundNumber(0)}%) sepia(${roundNumber(1)}%) saturate(${roundNumber(2)}%) hue-rotate(${roundNumber(3, 3.6)}deg) brightness(${roundNumber(4)}%) contrast(${roundNumber(5)}%)`;
    }
}

export function toFilter(rgbRed, rgbGreen, rgbBlue) {
    const initialColor = new Color(rgbRed, rgbGreen, rgbBlue);
    const colorSolver = new ColorSolver(initialColor);
    const solution = colorSolver.solve();
    return solution.filter;
}
