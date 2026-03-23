function JQueryLiteCollection(values) {
    this.values = Array.isArray(values)
        ? values.filter(function (value) {
              return value != null;
          })
        : [];

    this.length = this.values.length;
    for (var index = 0; index < this.length; index += 1) {
        this[index] = this.values[index];
    }
}

JQueryLiteCollection.prototype.addClass = function (className) {
    var classNames = splitClassNames(className);
    return this.applyToElements(function (element) {
        classNames.forEach(function (token) {
            element.classList.add(token);
        });
    });
};

JQueryLiteCollection.prototype.removeClass = function (className) {
    var classNames = splitClassNames(className);
    return this.applyToElements(function (element) {
        classNames.forEach(function (token) {
            element.classList.remove(token);
        });
    });
};

JQueryLiteCollection.prototype.toggleClass = function (className) {
    var classNames = splitClassNames(className);
    return this.applyToElements(function (element) {
        classNames.forEach(function (token) {
            element.classList.toggle(token);
        });
    });
};

JQueryLiteCollection.prototype.hasClass = function (className) {
    return this.getElements().some(function (element) {
        return element.classList.contains(className);
    });
};

JQueryLiteCollection.prototype.find = function (selector) {
    var found = [];
    this.values.forEach(function (value) {
        if (isParentNode(value)) {
            found = found.concat(Array.from(value.querySelectorAll(selector)));
        }
    });
    return new JQueryLiteCollection(found);
};

JQueryLiteCollection.prototype.empty = function () {
    return this.applyToElements(function (element) {
        while (element.firstChild) {
            element.removeChild(element.firstChild);
        }
    });
};

JQueryLiteCollection.prototype.text = function (value) {
    if (value === undefined) {
        var firstTextNode = this.values.find(function (item) {
            return item && typeof item.textContent === "string";
        });
        return (firstTextNode && firstTextNode.textContent) || "";
    }

    var textValue = String(value);
    return this.applyToElements(function (element) {
        element.textContent = textValue;
    });
};

JQueryLiteCollection.prototype.html = function (value) {
    if (value === undefined) {
        var firstElement = this.getElements()[0];
        return (firstElement && firstElement.innerHTML) || "";
    }

    var htmlValue = String(value);
    return this.applyToElements(function (element) {
        element.innerHTML = htmlValue;
    });
};

JQueryLiteCollection.prototype.append = function (content) {
    var targets = this.getElements();
    if (targets.length === 0 || content == null) {
        return this;
    }

    if (typeof content === "string") {
        targets.forEach(function (target) {
            target.insertAdjacentHTML("beforeend", content);
        });
        return this;
    }

    var nodes = normalizeToNodes(content);
    if (nodes.length === 0) {
        return this;
    }

    targets.forEach(function (target, targetIndex) {
        nodes.forEach(function (node, nodeIndex) {
            var shouldClone =
                targetIndex < targets.length - 1 || nodeIndex < nodes.length - 1;
            target.appendChild(shouldClone ? node.cloneNode(true) : node);
        });
    });

    return this;
};

JQueryLiteCollection.prototype.attr = function (name, value) {
    var first = this.values[0];
    if (value === undefined) {
        if (isElement(first)) {
            var attrValue = first.getAttribute(name);
            return attrValue == null ? undefined : attrValue;
        }
        return undefined;
    }

    return this.applyToElements(function (element) {
        if (value === null) {
            element.removeAttribute(name);
            return;
        }
        element.setAttribute(name, String(value));
    });
};

JQueryLiteCollection.prototype.on = function (eventName, selectorOrHandler, handler) {
    var events = eventName
        .split(" ")
        .map(function (token) {
            return token.trim();
        })
        .filter(function (token) {
            return token.length > 0;
        });

    if (events.length === 0) {
        return this;
    }

    if (typeof selectorOrHandler === "function") {
        var directHandler = selectorOrHandler;
        this.values.forEach(function (value) {
            if (isEventTarget(value)) {
                events.forEach(function (event) {
                    value.addEventListener(event, function (domEvent) {
                        directHandler.call(this, domEvent);
                    });
                });
            }
        });
        return this;
    }

    if (typeof selectorOrHandler === "string" && typeof handler === "function") {
        var selector = selectorOrHandler;
        this.values.forEach(function (value) {
            if (!isEventTarget(value)) {
                return;
            }

            events.forEach(function (event) {
                value.addEventListener(event, function (domEvent) {
                    var target = domEvent.target;
                    if (!(target instanceof Element)) {
                        return;
                    }

                    var matched = target.closest(selector);
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
};

JQueryLiteCollection.prototype.click = function (handler) {
    if (handler) {
        return this.on("click", handler);
    }

    return this.applyToElements(function (element) {
        if (typeof element.click === "function") {
            element.click();
        } else {
            element.dispatchEvent(
                new MouseEvent("click", { bubbles: true, cancelable: true })
            );
        }
    });
};

JQueryLiteCollection.prototype.each = function (callback) {
    for (var index = 0; index < this.values.length; index += 1) {
        var value = this.values[index];
        var result = callback.call(value, index, value);
        if (result === false) {
            break;
        }
    }
    return this;
};

JQueryLiteCollection.prototype.remove = function () {
    this.values.forEach(function (value) {
        if (value && value.parentNode) {
            value.parentNode.removeChild(value);
        }
    });
    return this;
};

JQueryLiteCollection.prototype.clone = function () {
    var cloned = this.values.map(function (value) {
        if (isNode(value)) {
            return value.cloneNode(true);
        }
        return value;
    });
    return new JQueryLiteCollection(cloned);
};

JQueryLiteCollection.prototype.toArray = function () {
    return this.values.slice();
};

JQueryLiteCollection.prototype.getElements = function () {
    return this.values.filter(function (value) {
        return isElement(value);
    });
};

JQueryLiteCollection.prototype.applyToElements = function (callback) {
    this.getElements().forEach(callback);
    return this;
};

function $(input) {
    if (input == null) {
        return new JQueryLiteCollection([]);
    }

    if (input instanceof JQueryLiteCollection) {
        return new JQueryLiteCollection(input.toArray());
    }

    if (typeof input === "string") {
        var trimmed = input.trim();
        if (trimmed.startsWith("<") && trimmed.endsWith(">")) {
            return new JQueryLiteCollection(createNodesFromHtml(trimmed));
        }

        try {
            return new JQueryLiteCollection(
                Array.from(document.querySelectorAll(input))
            );
        } catch (_error) {
            return new JQueryLiteCollection([]);
        }
    }

    if (isArrayLike(input) && !isWindow(input)) {
        return new JQueryLiteCollection(Array.from(input));
    }

    return new JQueryLiteCollection([input]);
}

$.each = function each(collection, callback) {
    if (collection == null || typeof callback !== "function") {
        return collection;
    }

    if (collection instanceof JQueryLiteCollection) {
        collection.each(callback);
        return collection;
    }

    if (isArrayLike(collection)) {
        for (var index = 0; index < collection.length; index += 1) {
            var value = collection[index];
            var result = callback.call(value, index, value);
            if (result === false) {
                break;
            }
        }
        return collection;
    }

    var keys = Object.keys(collection);
    for (var keyIndex = 0; keyIndex < keys.length; keyIndex += 1) {
        var key = keys[keyIndex];
        var objectValue = collection[key];
        var objectResult = callback.call(objectValue, key, objectValue);
        if (objectResult === false) {
            break;
        }
    }
    return collection;
};

$.parseJSON = function parseJSON(value) {
    return JSON.parse(value);
};

function splitClassNames(value) {
    return String(value || "")
        .split(/\s+/)
        .map(function (token) {
            return token.trim();
        })
        .filter(function (token) {
            return token.length > 0;
        });
}

function normalizeToNodes(content) {
    if (content == null) {
        return [];
    }

    if (content instanceof JQueryLiteCollection) {
        return content.toArray().filter(function (value) {
            return isNode(value);
        });
    }

    if (isNode(content)) {
        return [content];
    }

    if (isArrayLike(content) && typeof content !== "string") {
        var nodes = [];
        Array.from(content).forEach(function (item) {
            nodes = nodes.concat(normalizeToNodes(item));
        });
        return nodes;
    }

    if (typeof content === "string") {
        return createNodesFromHtml(content);
    }

    return [document.createTextNode(String(content))];
}

function createNodesFromHtml(html) {
    var template = document.createElement("template");
    template.innerHTML = html;
    return Array.from(template.content.childNodes);
}

function isNode(value) {
    return typeof Node !== "undefined" && value instanceof Node;
}

function isElement(value) {
    return typeof Element !== "undefined" && value instanceof Element;
}

function isWindow(value) {
    return typeof Window !== "undefined" && value instanceof Window;
}

function isArrayLike(value) {
    return (
        value != null &&
        typeof value !== "function" &&
        typeof value !== "string" &&
        typeof value.length === "number"
    );
}

function isParentNode(value) {
    return value != null && typeof value.querySelectorAll === "function";
}

function isEventTarget(value) {
    return value != null && typeof value.addEventListener === "function";
}

module.exports = $;
module.exports.default = $;
