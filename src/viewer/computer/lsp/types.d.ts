interface L4RCTypeMap {
    [prop: string]: L4RCType
}

interface L4RCType {
    type?: string
    name?: string
    doc?: string
    mode?: string
    properties?: L4RCTypeMap
    args?: L4RCTypeMap
    returns?: string
    inherits?: string[]
}