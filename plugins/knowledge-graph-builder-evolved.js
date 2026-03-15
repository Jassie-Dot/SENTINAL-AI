import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_PATH = path.join(__dirname, '..', 'data', 'knowledge-graph.json');

function ensureEntity(graph, entityName) {
    if (!graph[entityName]) {
        graph[entityName] = {
            name: entityName,
            relationships: []
        };
    }

    return graph[entityName];
}

function normalizeName(value = '') {
    return value.trim().toLowerCase();
}

function parseBuildInput(userInput = '') {
    const entitiesMatch = userInput.match(/entities?\s*:\s*([^;]+)/i);
    const relationshipsMatch = userInput.match(/relationships?\s*:\s*([^;]+)/i);

    const entities = entitiesMatch
        ? entitiesMatch[1].split(',').map(item => normalizeName(item)).filter(Boolean)
        : [];

    const relationships = relationshipsMatch
        ? relationshipsMatch[1]
            .split(',')
            .map(item => item.trim())
            .map(item => item.split(/->|-|:/).map(part => normalizeName(part)).filter(Boolean))
            .filter(parts => parts.length >= 2)
            .map(([from, to]) => ({ from, to }))
        : [];

    if (!entities.length && !relationships.length) {
        const simpleMatch = userInput.match(/([a-z0-9_ ]+)\s+(knows|likes|works with|belongs to)\s+([a-z0-9_ ]+)/i);
        if (simpleMatch) {
            return {
                entities: [normalizeName(simpleMatch[1]), normalizeName(simpleMatch[3])],
                relationships: [{ from: normalizeName(simpleMatch[1]), to: normalizeName(simpleMatch[3]) }]
            };
        }
    }

    return { entities, relationships };
}

const plugin = {
    name: 'knowledge-graph-builder',
    version: '1.1.0',
    description: 'Builds and queries a lightweight knowledge graph stored on disk.',

    async initialize() {
        console.log('[knowledge-graph-builder] Plugin online');
        await fs.promises.mkdir(path.dirname(DATA_PATH), { recursive: true });
        this.graph = {};

        if (fs.existsSync(DATA_PATH)) {
            const saved = await fs.promises.readFile(DATA_PATH, 'utf8');
            this.graph = JSON.parse(saved);
        }
    },

    canHandle(intent, userInput) {
        return /\b(knowledge graph|entity|relationship|graph query|graph build)\b/i.test(userInput);
    },

    async handle(intent, userInput) {
        if (!this.graph) {
            this.graph = {};
        }

        const isQuery = /\b(query|find|lookup|search)\b/i.test(userInput);
        if (isQuery) {
            const query = userInput.replace(/.*?\b(query|find|lookup|search)\b[:\s]*/i, '').trim().toLowerCase();
            if (!query) {
                return { success: false, message: 'Provide a term to query.' };
            }

            const matches = Object.values(this.graph).filter(entity =>
                entity.name.includes(query) ||
                entity.relationships.some(relationship => relationship.to.includes(query))
            );

            if (!matches.length) {
                return { success: false, message: `No graph entries matched "${query}".` };
            }

            const summary = matches.map(entity => {
                const relations = entity.relationships.map(relationship => relationship.to).join(', ') || 'none';
                return `${entity.name}: ${relations}`;
            }).join('\n');

            return { success: true, message: summary };
        }

        const { entities, relationships } = parseBuildInput(userInput);
        if (!entities.length && !relationships.length) {
            return {
                success: false,
                message: 'Use "entities: a, b; relationships: a-b" to build the graph.'
            };
        }

        entities.forEach(entityName => {
            ensureEntity(this.graph, entityName);
        });

        relationships.forEach(({ from, to }) => {
            const source = ensureEntity(this.graph, from);
            ensureEntity(this.graph, to);

            if (!source.relationships.some(relationship => relationship.to === to)) {
                source.relationships.push({ to });
            }
        });

        await fs.promises.writeFile(DATA_PATH, JSON.stringify(this.graph, null, 2));

        return {
            success: true,
            message: `Knowledge graph updated with ${entities.length} entities and ${relationships.length} relationships.`
        };
    }
};

export default plugin;
