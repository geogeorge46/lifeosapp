import { RelationshipsRepository } from "./relationships.repository";
import { prisma } from "../../infrastructure/database/prisma.client";

const INVERSE_RELATIONS: Record<string, string> = {
  parent: "child",
  child: "parent",
  manager: "reports_to",
  reports_to: "manager",
};

export class RelationshipsService {
  constructor(private repo: RelationshipsRepository) {}

  async addRelationship(
    userId: string,
    personAId: string,
    personBId: string,
    type: string
  ) {
    if (personAId === personBId) {
      throw new Error("Cannot link a contact to themselves.");
    }

    // Verify contact access
    const contacts = await prisma.person.findMany({
      where: {
        id: { in: [personAId, personBId] },
        userId,
      },
    });

    if (contacts.length !== 2) {
      throw new Error("One or both contact profiles were not found or access was denied.");
    }

    const cleanType = type.trim().toLowerCase();

    // 1. Create Forward Edge A -> B
    const forward = await this.repo.createRelationship(personAId, personBId, cleanType);

    // 2. Create Mirrored / Inverse Edge B -> A
    const inverseType = INVERSE_RELATIONS[cleanType] || cleanType;
    await this.repo.createRelationship(personBId, personAId, inverseType);

    return forward;
  }

  async getRelationships(userId: string) {
    return this.repo.findAllByUserId(userId);
  }

  async removeRelationship(userId: string, id: string) {
    const rel = await this.repo.findById(id);
    if (!rel) {
      throw new Error("Relationship not found.");
    }

    // Verify access
    if (rel.personA.userId !== userId) {
      throw new Error("Access denied.");
    }

    // 1. Delete Forward Edge
    await this.repo.delete(id);

    // 2. Delete Mirrored Edge
    const inverseType = INVERSE_RELATIONS[rel.type] || rel.type;
    await this.repo.deleteLink(rel.personBId, rel.personAId, inverseType);
  }

  async getConnectionsGraph(userId: string, startPersonId: string) {
    // 1. Build adjacency list of all relationships for this user
    const relationships = await this.repo.findAllByUserId(userId);
    const people = await prisma.person.findMany({ where: { userId } });

    const peopleNames: Record<string, string> = {};
    people.forEach((p) => {
      peopleNames[p.id] = p.name;
    });

    const adj: Record<string, Array<{ toId: string; type: string; toName: string }>> = {};
    people.forEach((p) => {
      adj[p.id] = [];
    });

    relationships.forEach((r) => {
      if (!adj[r.personAId]) adj[r.personAId] = [];
      adj[r.personAId].push({
        toId: r.personBId,
        type: r.type,
        toName: peopleNames[r.personBId] || "Unknown",
      });
    });

    // 2. Run BFS up to 3 degrees out
    const paths: Record<string, Array<{ name: string; relation: string }>> = {};
    const visited = new Set<string>();
    visited.add(startPersonId);

    interface QueueItem {
      id: string;
      currentPath: Array<{ name: string; relation: string }>;
      depth: number;
    }

    const queue: QueueItem[] = [{ id: startPersonId, currentPath: [], depth: 0 }];

    while (queue.length > 0) {
      const { id, currentPath, depth } = queue.shift()!;

      if (depth >= 3) continue;

      const neighbors = adj[id] || [];
      for (const edge of neighbors) {
        if (!visited.has(edge.toId)) {
          visited.add(edge.toId);
          
          const newPathItem = {
            name: edge.toName,
            relation: edge.type,
          };
          const newPath = [...currentPath, newPathItem];
          
          paths[edge.toId] = newPath;

          queue.push({
            id: edge.toId,
            currentPath: newPath,
            depth: depth + 1,
          });
        }
      }
    }

    return paths;
  }
}
