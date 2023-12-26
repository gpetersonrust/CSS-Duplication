const fs = require('fs');

class MoxcarCssProcessor {
    constructor(cssFilePath) {
        // Constructor to initialize class properties
        this.cssFilePath = cssFilePath;
        this.classes = { base: {} };
        // Regular expressions for matching selectors and media queries
        this.selectorRegex = /([.#]?[a-zA-Z0-9-_\*]+)\s*{([^}]*)}/g;
        this.mediaRegex = /(@media[^{]+){([^}]*)}/g;
        // Regex to match text before @media queries
        this.mediaRegexPattern = /([\s\S]*?)(?=@media)/;
    }

    processCss() {
        // Read the CSS file content
        const cssCode = fs.readFileSync(this.cssFilePath, 'utf-8');
        // Match text before @media queries
        const textBeforeMediaQueries = cssCode.match(this.mediaRegexPattern);

        if (textBeforeMediaQueries) {
            // Process regular selectors before @media queries
            this.processSelectors(textBeforeMediaQueries[0]);
            // Process @media queries and their selectors
            this.processMediaQueries(cssCode);
            // Find and remove duplicate rules
            this.findAndRemoveDuplicates();
            // Log the processed classes
            // Remove empty classes
            let keys = Object.keys(this.classes);
            this.remove_empty_classes(keys);
        } else {
            console.log("No match found for text before @media queries.");
        }
    }

    // Helper function to remove empty classes from the processed CSS
    remove_empty_classes(keys) {
        keys.forEach(key => {
            let obj = this.classes[key];
            let selectorKeys = Object.keys(obj);
            selectorKeys.forEach(selector => {
                let selectorObj = obj[selector];
                if (Object.keys(selectorObj).length === 0) {
                    delete obj[selector];
                }
            });
        });
    }

    processSelectors(cssText) {
        // Split the cssText using "}" as a delimiter to handle multiple selectors
        const selectorMatch = cssText.split("}").map(text => text + "}");
        if (selectorMatch) {
            // Process each regular selector
            selectorMatch.forEach(selector => this.processCssRule(selector, 'base'));
        }
    }

    processMediaQueries(cssCode) {
        // Match @media queries
        const mediaMatch = cssCode.match(this.mediaRegex);

        if (mediaMatch) {
            // Process each @media query and its selectors
            mediaMatch.forEach(media => {
                const mediaQuery = media.match(/@media[^{]+/)[0];
                this.classes[mediaQuery] = {};
                const mediaRules = media.match(this.selectorRegex);

                if (mediaRules) {
                    mediaRules.forEach(selector => this.processCssRule(selector, mediaQuery));
                }
            });
        }
    }

    findAndRemoveDuplicates() {
        // Get all keys from the classes object
        const keys = Object.keys(this.classes);

        // Iterate through media queries and selectors
        keys.forEach((key, mediaIndex) => {
            // Skip the 'base' key
            if (key === 'base') {
                return;
            }

            // Get current media queries and selector keys
            const currentMedia = this.classes[key];
            const selectorKeys = Object.keys(currentMedia);

            // Iterate through selectors
            selectorKeys.forEach(selector => {
                const currentSelector = currentMedia[selector];

                const baseSelector = this.classes['base'][selector];
                const previousMediaSelector = mediaIndex - 1;
                const previousMedia = this.classes[keys[previousMediaSelector]];
                const previousSelector = previousMedia[selector];

                // Check and remove duplicates with base media
                if (baseSelector && previousMediaSelector === 0) {
                    this.checkAndRemoveDuplicates(currentSelector, baseSelector);
                }

                // Check and remove duplicates with previous media
                if (previousSelector) {
                    this.checkAndRemoveDuplicates(currentSelector, previousSelector);
                }
            });
        });
    }

    checkAndRemoveDuplicates(currentSelector, otherSelector) {
        // Get all keys from the current selector
        const currentKeys = Object.keys(currentSelector);

        // Iterate through keys and check for duplicates
        currentKeys.forEach(currentKey => {
            const currentValue = currentSelector[currentKey];
            const otherValue = otherSelector[currentKey];

            // If values are the same, log and delete the duplicate rule
            if (currentValue === otherValue) {
                delete currentSelector[currentKey];
            }
        });
    }

    ifNotANumberTrim(str) {
        // Helper function to trim and check if a value is a number
        return isNaN(str) ? str?.trim() : str;
    }

    processCssRule(selector, mediaQuery) {
        // Split the selector and rules using "{"
        let array = selector.split('{');
        if (array[1] === undefined || array[0] === undefined) {
            return;
        }

        const name = array[0].trim();
        const rules = array[1].trim();

        // Split rules into key-value pairs and store them in an object
        const rulesObject = rules.split(';').reduce((obj, str) => {
            if (str !== '') {
                const split = str.split(':');
                if (split[0] && split[1]) obj[this.ifNotANumberTrim(split[0])] = this.ifNotANumberTrim(split[1]);
            }
            return obj;
        }, {});

        // Store the rulesObject in the classes object under the appropriate mediaQuery and selector
        this.classes[mediaQuery][name] = rulesObject;
    }

    // Function to write the modified CSS back to the file
    writeModifiedCssToFile() {
        const modifiedCss = this.generateModifiedCss();
        fs.writeFileSync(this.cssFilePath, modifiedCss, 'utf-8');
        console.log('Modified CSS has been written back to the file successfully.');
    }

    // Function to generate the modified CSS based on the processed classes
    generateModifiedCss() {
        // Combine the base and media queries into a single CSS string
        let baseCss = this.generateCssForMedia('base', this.classes['base']);
        // Remove base { and closing }
        baseCss = baseCss.replace('base{', '');
        // Remove last }
        baseCss = baseCss.substring(0, baseCss.length - 1);

        const mediaCss = Object.keys(this.classes)
            .filter(key => key !== 'base')
            .map(mediaKey => this.generateCssForMedia(mediaKey, this.classes[mediaKey]))
            .join('\n\n');

        // Combine base and media queries
        return `${baseCss}\n\n${mediaCss}`;
    }

    // Function to generate CSS for a specific media query
    generateCssForMedia(mediaQuery, mediaRules) {
        const selectorCss = Object.keys(mediaRules)
            .map(selector => this.generateCssForSelector(selector, mediaRules[selector]))
            .join('\n\n');
        return `${mediaQuery.trim()}{\n${selectorCss}\n}`;
    }

    // Function to generate CSS for a specific selector
    generateCssForSelector(selector, rules) {
        const rulesCss = Object.keys(rules)
            .map(property => `${property}: ${rules[property]};`)
            .join('\n    ');
        return `    ${selector} {\n    ${rulesCss}\n    }`;
    }
}

// Usage
const moxcarCssProcessorInstance = new MoxcarCssProcessor('/Users/ginopeterson/Desktop/CSS Duplication/style.css');
moxcarCssProcessorInstance.processCss();
moxcarCssProcessorInstance.writeModifiedCssToFile();

// console.log(moxcarCssProcessorInstance.classes);
