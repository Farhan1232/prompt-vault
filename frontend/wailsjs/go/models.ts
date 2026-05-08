export namespace main {
	
	export class Variable {
	    id: number;
	    promptId: number;
	    name: string;
	    defaultValue: string;
	    description: string;
	
	    static createFrom(source: any = {}) {
	        return new Variable(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.promptId = source["promptId"];
	        this.name = source["name"];
	        this.defaultValue = source["defaultValue"];
	        this.description = source["description"];
	    }
	}
	export class Tag {
	    id: number;
	    name: string;
	    color: string;
	
	    static createFrom(source: any = {}) {
	        return new Tag(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.color = source["color"];
	    }
	}
	export class Prompt {
	    id: number;
	    title: string;
	    content: string;
	    description: string;
	    collectionId?: number;
	    isFavorite: boolean;
	    isPinned: boolean;
	    rating: number;
	    useCount: number;
	    lastUsedAt?: string;
	    modelHint: string;
	    notes: string;
	    tags: Tag[];
	    variables: Variable[];
	    createdAt: string;
	    updatedAt: string;
	
	    static createFrom(source: any = {}) {
	        return new Prompt(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.title = source["title"];
	        this.content = source["content"];
	        this.description = source["description"];
	        this.collectionId = source["collectionId"];
	        this.isFavorite = source["isFavorite"];
	        this.isPinned = source["isPinned"];
	        this.rating = source["rating"];
	        this.useCount = source["useCount"];
	        this.lastUsedAt = source["lastUsedAt"];
	        this.modelHint = source["modelHint"];
	        this.notes = source["notes"];
	        this.tags = this.convertValues(source["tags"], Tag);
	        this.variables = this.convertValues(source["variables"], Variable);
	        this.createdAt = source["createdAt"];
	        this.updatedAt = source["updatedAt"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class ChainStep {
	    id: number;
	    chainId: number;
	    promptId: number;
	    stepOrder: number;
	    prompt?: Prompt;
	
	    static createFrom(source: any = {}) {
	        return new ChainStep(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.chainId = source["chainId"];
	        this.promptId = source["promptId"];
	        this.stepOrder = source["stepOrder"];
	        this.prompt = this.convertValues(source["prompt"], Prompt);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class Collection {
	    id: number;
	    name: string;
	    description: string;
	    color: string;
	    icon: string;
	    createdAt: string;
	    updatedAt: string;
	    promptCount: number;
	
	    static createFrom(source: any = {}) {
	        return new Collection(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.description = source["description"];
	        this.color = source["color"];
	        this.icon = source["icon"];
	        this.createdAt = source["createdAt"];
	        this.updatedAt = source["updatedAt"];
	        this.promptCount = source["promptCount"];
	    }
	}
	
	export class PromptChain {
	    id: number;
	    name: string;
	    description: string;
	    steps: ChainStep[];
	    createdAt: string;
	
	    static createFrom(source: any = {}) {
	        return new PromptChain(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.description = source["description"];
	        this.steps = this.convertValues(source["steps"], ChainStep);
	        this.createdAt = source["createdAt"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class PromptVersion {
	    id: number;
	    promptId: number;
	    content: string;
	    versionNote: string;
	    createdAt: string;
	
	    static createFrom(source: any = {}) {
	        return new PromptVersion(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.promptId = source["promptId"];
	        this.content = source["content"];
	        this.versionNote = source["versionNote"];
	        this.createdAt = source["createdAt"];
	    }
	}
	export class Stats {
	    totalPrompts: number;
	    totalCollections: number;
	    totalTags: number;
	    totalUses: number;
	    favoriteCount: number;
	    mostUsedCount: number;
	
	    static createFrom(source: any = {}) {
	        return new Stats(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.totalPrompts = source["totalPrompts"];
	        this.totalCollections = source["totalCollections"];
	        this.totalTags = source["totalTags"];
	        this.totalUses = source["totalUses"];
	        this.favoriteCount = source["favoriteCount"];
	        this.mostUsedCount = source["mostUsedCount"];
	    }
	}
	

}

