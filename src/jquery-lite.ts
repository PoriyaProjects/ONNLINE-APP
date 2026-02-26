type JQueryLiteInput =
    | string
    | Node
    | Window
    | ArrayLike<unknown>
    | JQueryLiteCollection
    | null
    | undefined;

type EachCallback = (this: any, index: number, value: any) => unknown;
type EventHandler = (this: any, event: Event) => unknown;

class JQueryLiteCollection {
    private readonly values: any[];

    constructor(values: any[]) {
        this.values = values.filter((value) => value != null);
    }

    get length(): number {
        return this.values.length;
    }

    addClass(className: string): this {
        const classNames = splitClassNames(className);
        return this.applyToElements((element) => {
            classNames.forEach((token) => element.classList.add(token));
        });
    }

    removeClass(className: string): this {
        const classNames = splitClassNames(className);
        return this.applyToElements((element) => {
            classNames.forEach((token) => element.classList.remove(token));
        });
    }

    toggleClass(className: string): this {
        const classNames = splitClassNames(className);
        return this.applyToElements((element) => {
            classNames.forEach((token) => element.classList.toggle(token));
        });
    }

    hasClass(className: string): boolean {
        return this.getElements().some((element) =>
            element.classList.contains(className)
        );
    }

    find(selector: string): JQueryLiteCollection {
        const found: Element[] = [];
        this.values.forEach((value) => {
            if (isParentNode(value)) {
                found.push(...Array.from(value.querySelectorAll(selector)));
            }
        });
        return new JQueryLiteCollection(found);
    }

    empty(): this {
        return this.applyToElements((element) => {
            while (element.firstChild) {
                element.removeChild(element.firstChild);
            }
        });
    }

    text(): string;
    text(value: string | number): this;
    text(value?: string | number): string | this {
        if (value === undefined) {
            const firstTextNode = this.values.find(
                (item) => item && typeof item.textContent === "string"
            );
            return firstTextNode?.textContent ?? "";
        }

        const textValue = String(value);
        return this.applyToElements((element) => {
            element.textContent = textValue;
        });
    }

    append(content: any): this {
        const targets = this.getElements();
        if (targets.length === 0 || content == null) {
            return this;
        }

        if (typeof content === "string") {
            targets.forEach((target) => target.insertAdjacentHTML("beforeend", content));
            return this;
        }

        const nodes = normalizeToNodes(content);
        if (nodes.length === 0) {
            return this;
        }

        targets.forEach((target, targetIndex) => {
            nodes.forEach((node, nodeIndex) => {
                const shouldClone =
                    targetIndex < targets.length - 1 || nodeIndex < nodes.length - 1;
                target.appendChild(shouldClone ? node.cloneNode(true) : node);
            });
        });

        return this;
    }

    attr(name: string): string | undefined;
    attr(name: string, value: string | number | boolean | null): this;
    attr(name: string, value?: string | number | boolean | null): string | this | undefined {
        const first = this.values[0];
        if (value === undefined) {
            if (isElement(first)) {
                return first.getAttribute(name) ?? undefined;
            }
            return undefined;
        }

        return this.applyToElements((element) => {
            if (value === null) {
                element.removeAttribute(name);
                return;
            }
            element.setAttribute(name, String(value));
        });
    }

    on(eventName: string, handler: EventHandler): this;
    on(eventName: string, selector: string, handler: EventHandler): this;
    on(eventName: string, selectorOrHandler: string | EventHandler, handler?: EventHandler): this {
        const events = eventName
            .split(" ")
            .map((token) => token.trim())
            .filter((token) => token.length > 0);

        if (events.length === 0) {
            return this;
        }

        if (typeof selectorOrHandler === "function") {
            const directHandler = selectorOrHandler;
            this.values.forEach((value) => {
                if (isEventTarget(value)) {
                    events.forEach((event) => {
                        value.addEventListener(event, function (domEvent: Event) {
                            directHandler.call(this, domEvent);
                        });
                    });
                }
            });
            return this;
        }

        if (typeof selectorOrHandler === "string" && typeof handler === "function") {
            const selector = selectorOrHandler;
            this.values.forEach((value) => {
                if (!isEventTarget(value)) {
                    return;
                }

                events.forEach((event) => {
                    value.addEventListener(event, function (domEvent: Event) {
                        const target = domEvent.target;
                        if (!(target instanceof Element)) {
                            return;
                        }

                        const matched = target.closest(selector);
                        if (!matched) {
                            return;
                        }

                        if (value instanceof Element && !value.contains(matched)) {
                            return;
                        }

                        handler.call(matched, domEvent);
                    });
                });
            });
        }

        return this;
    }

    click(handler?: EventHandler): this {
        if (handler) {
            return this.on("click", handler);
        }

        return this.applyToElements((element) => {
            if (typeof (element as HTMLElement).click === "function") {
                (element as HTMLElement).click();
            } else {
                element.dispatchEvent(
                    new MouseEvent("click", { bubbles: true, cancelable: true })
                );
            }
        });
    }

    each(callback: EachCallback): this {
        for (let index = 0; index < this.values.length; index += 1) {
            const value = this.values[index];
            const result = callback.call(value, index, value);
            if (result === false) {
                break;
            }
        }
        return this;
    }

    toArray(): any[] {
        return [...this.values];
    }

    private getElements(): Element[] {
        return this.values.filter((value): value is Element => isElement(value));
    }

    private applyToElements(callback: (element: Element) => void): this {
        this.getElements().forEach(callback);
        return this;
    }
}

function $(input: JQueryLiteInput): JQueryLiteCollection {
    if (input == null) {
        return new JQueryLiteCollection([]);
    }

    if (input instanceof JQueryLiteCollection) {
        return new JQueryLiteCollection(input.toArray());
    }

    if (typeof input === "string") {
        try {
            return new JQueryLiteCollection(Array.from(document.querySelectorAll(input)));
        } catch (error) {
            return new JQueryLiteCollection([]);
        }
    }

    if (isArrayLike(input) && !isWindow(input)) {
        return new JQueryLiteCollection(Array.from(input as ArrayLike<unknown>));
    }

    return new JQueryLiteCollection([input]);
}

const jqueryLite = $ as any;

jqueryLite.each = function each(collection: any, callback: EachCallback): any {
    if (collection == null || typeof callback !== "function") {
        return collection;
    }

    if (collection instanceof JQueryLiteCollection) {
        collection.each(callback);
        return collection;
    }

    if (isArrayLike(collection)) {
        for (let index = 0; index < collection.length; index += 1) {
            const value = collection[index];
            const result = callback.call(value, index, value);
            if (result === false) {
                break;
            }
        }
        return collection;
    }

    const keys = Object.keys(collection);
    for (let index = 0; index < keys.length; index += 1) {
        const key = keys[index];
        const value = collection[key];
        const result = callback.call(value, key as any, value);
        if (result === false) {
            break;
        }
    }

    return collection;
};

jqueryLite.parseJSON = function parseJSON(value: string): any {
    return JSON.parse(value);
};

function splitClassNames(value: string): string[] {
    return value
        .split(/\s+/)
        .map((token) => token.trim())
        .filter((token) => token.length > 0);
}

function normalizeToNodes(content: any): Node[] {
    if (content == null) {
        return [];
    }

    if (content instanceof JQueryLiteCollection) {
        return content
            .toArray()
            .filter((value): value is Node => isNode(value));
    }

    if (isNode(content)) {
        return [content];
    }

    if (isArrayLike(content) && typeof content !== "string") {
        const nodes: Node[] = [];
        Array.from(content as ArrayLike<unknown>).forEach((item) => {
            nodes.push(...normalizeToNodes(item));
        });
        return nodes;
    }

    if (typeof content === "string") {
        const template = document.createElement("template");
        template.innerHTML = content;
        return Array.from(template.content.childNodes);
    }

    return [document.createTextNode(String(content))];
}

function isNode(value: any): value is Node {
    return typeof Node !== "undefined" && value instanceof Node;
}

function isElement(value: any): value is Element {
    return typeof Element !== "undefined" && value instanceof Element;
}

function isWindow(value: any): value is Window {
    return typeof Window !== "undefined" && value instanceof Window;
}

function isArrayLike(value: any): value is ArrayLike<unknown> {
    return (
        value != null &&
        typeof value !== "function" &&
        typeof value !== "string" &&
        typeof value.length === "number"
    );
}

function isParentNode(value: any): value is ParentNode {
    return value != null && typeof value.querySelectorAll === "function";
}

function isEventTarget(value: any): value is EventTarget {
    return value != null && typeof value.addEventListener === "function";
}

export = $;
