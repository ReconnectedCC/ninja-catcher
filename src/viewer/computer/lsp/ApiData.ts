const brackets = /\[.*\]/g

export interface L4RCType {

    [key: string]: any;

}

const additionalTriggers: { [key: string]: string } = {
    // trigger: "Key",
}

export default class L4RCApiData {

    private classes: L4RCTypeMap
    private defines: L4RCTypeMap

    constructor(classes: L4RCTypeMap, defines: L4RCTypeMap) {
        this.classes = {};
        this.defines = {};
        this.initData(classes, defines)
    }

    public static async load(dataPath: string): Promise<L4RCApiData> {
        const [classes, defines] = await Promise.all([
            fetch(dataPath + "/classes.json").then(r => r.json()),
            fetch(dataPath + "/defines.json").then(r => r.json()),
        ]);
        return new L4RCApiData(classes, defines);
    }

    public findType(words: string[]): L4RCType {
        if (words.length === 0) {
            return { properties: this.classes }
        }

        // Clean up path by removing array/dict access brackets (players[0] => players)
        words = words.map(p => p.replace(brackets, ""))
        
        const firstWord = words.shift();
        if (!firstWord) {
            return {};
        }
        let type = this.classes[firstWord];

        if (!type) {
            return {}
        }

        if (!type.properties || words.length === 0) {
            return type
        }

        let props = type.properties

        for (let i = 0; i < words.length; i++) {
            type = props[words[i]]

            // Not found
            if (!type) return {}

            // First try traverse it's own properties
            if (type.properties) {
                props = type.properties
                continue
            }

            // Then the complete type list
            let parentType = type.type

            // Special handling for defines
            if (parentType && /defines/.test(parentType)) {
                let [__, defineName] = parentType.split(".")
                //let define = this.defines[defineName]
                //return _.get(this.defines, [defineName, "properties"])
                if (defineName && this.defines[defineName])
                    return this.defines[defineName]
                else
                    return {}
            }

            if (parentType) {
                type = this.classes[parentType]
            } else {
                return {}
            }

            if (type && type.properties) {
                props = type.properties
                continue
            }
        }

        return type
    }

    private initData(classes: L4RCTypeMap, defines: L4RCTypeMap) {
        // Add some additional autocomplete triggers (when typing on blank line or pressing ctrl-space)
        Object.keys(additionalTriggers).forEach(trigger => {
            let luaType = additionalTriggers[trigger]
            if (luaType in classes) {
                classes[trigger] = classes[luaType]
            }
        })

        this.classes = classes
        this.defines = defines
        // todo: revisit this
        this.classes.defines = {
            type: "define",
            properties: defines
        }
    }
}