import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { createClient } from 'redis';

const plugin = {
    name: 'knowledge-graph-builder',
    version: '1.0.0',
    description: 'Knowledge graph builder plugin would enable me to create a comprehensive and dynamic graph of entities, relationships, and, allowing for more sophisticated reasoning, inference, and decision-making capabilities. This would be particularly useful in applications such as question answering, natural language, and expert systems, where the ability to represent and reason about complex knowledge is crucial. By integrating a knowledge graph builder, I would be able to better understand the context and relationships between different pieces of information, making me more intelligent and helpful in a wide range of tasks and applications.',
    
    async initialize() {
        console.log('[knowledge-graph-builder] Plugin online');
        this.redisClient = createClient({
            socket: {
                port: process.env.REDIS_PORT,
                host: process.env.REDIS_HOST,
            },
            password: process.env.REDIS_PASSWORD,
        });
        await this.redisClient.connect();
    },
    
    canHandle(intent, userInput) {
        const keywords = ['build', 'graph', 'knowledge', 'entity', 'relationship'];
        return keywords.some(k => userInput.toLowerCase().includes(k));
    },
    
    async handle(intent, userInput, context) {
        if (!context.knowledgeGraph) {
            context.knowledgeGraph = {};
        }

        if (intent === 'build') {
            const entities = userInput.match(/(?:entity|entities)\s*:\s*([^\s]+)/g);
            const relationships = userInput.match(/(?:relationship|relationships)\s*:\s*([^\s]+)/g);

            if (entities && relationships) {
                entities.forEach(entity => {
                    const entityName = entity.replace('entity: ', '').replace('entities: ', '');
                    context.knowledgeGraph[entityName] = {
                        id: uuidv4(),
                        name: entityName,
                        relationships: [],
                    };
                });

                relationships.forEach(relationship => {
                    const relationshipName = relationship.replace('relationship: ', '').replace('relationships: ', '');
                    const [entity1, entity2] = relationshipName.split('-');
                    if (context.knowledgeGraph[entity1] && context.knowledgeGraph[entity2]) {
                        context.knowledgeGraph[entity1].relationships.push(context.knowledgeGraph[entity2].id);
                        context.knowledgeGraph[entity2].relationships.push(context.knowledgeGraph[entity1].id);
                    }
                });

                await this.redisClient.set('knowledgeGraph', JSON.stringify(context.knowledgeGraph));
                return { success: true, message: 'Knowledge graph built successfully' };
            } else {
                return { success: false, message: 'Invalid input. Please provide entities and relationships' };
            }
        } else if (intent === 'query') {
            const query = userInput.match(/(?:query)\s*:\s*([^\s]+)/g);
            if (query) {
                const queryString = query[0].replace('query: ', '');
                const graph = await this.redisClient.get('knowledgeGraph');
                if (graph) {
                    const knowledgeGraph = JSON.parse(graph);
                    const result = this.queryGraph(knowledgeGraph, queryString);
                    return { success: true, message: result };
                } else {
                    return { success: false, message: 'Knowledge graph not found' };
                }
            } else {
                return { success: false, message: 'Invalid input. Please provide a query' };
            }
        } else {
            return { success: false, message: 'Invalid intent' };
        }
    },

    queryGraph(graph, query) {
        const entities = Object.keys(graph);
        const result = [];
        entities.forEach(entity => {
            if (graph[entity].name.includes(query)) {
                result.push(graph[entity].name);
            }
            graph[entity].relationships.forEach(relationship => {
                if (graph[relationship].name.includes(query)) {
                    result.push(graph[relationship].name);
                }
            });
        });
        return result.join(', ');
    }
};
export default plugin;