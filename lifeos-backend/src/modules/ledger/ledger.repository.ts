import { prisma } from "../../infrastructure/database/prisma.client";

export class LedgerRepository {
  async createTransaction(data: {
    userId: string;
    personId?: string | null;
    placeId?: string | null;
    amount: number;
    type: "EXPENSE" | "LENT" | "BORROWED";
    description: string;
    category?: string | null;
    dueDate?: Date | null;
    parentId?: string | null;
    status?: "PENDING" | "SETTLED";
    settledAt?: Date | null;
  }) {
    return prisma.transaction.create({
      data: {
        userId: data.userId,
        personId: data.personId || null,
        placeId: data.placeId || null,
        amount: data.amount,
        type: data.type,
        description: data.description,
        category: data.category || null,
        dueDate: data.dueDate || null,
        parentId: data.parentId || null,
        status: data.status || "PENDING",
        settledAt: data.settledAt || null,
      },
      include: {
        person: true,
        place: true,
        parent: true,
        partialPayments: true,
      },
    });
  }

  async findAllByUserId(userId: string) {
    return prisma.transaction.findMany({
      where: { userId },
      include: {
        person: true,
        place: true,
        parent: true,
        partialPayments: {
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async findById(id: string) {
    return prisma.transaction.findUnique({
      where: { id },
      include: {
        person: true,
        place: true,
        parent: true,
        partialPayments: true,
      },
    });
  }

  async updateStatus(id: string, status: "PENDING" | "SETTLED", settledAt: Date | null = null) {
    return prisma.transaction.update({
      where: { id },
      data: {
        status: status,
        settledAt: settledAt,
      },
      include: {
        person: true,
        place: true,
        parent: true,
        partialPayments: true,
      },
    });
  }

  async updateAmount(id: string, amount: number) {
    return prisma.transaction.update({
      where: { id },
      data: { amount },
      include: {
        person: true,
        place: true,
        parent: true,
        partialPayments: true,
      },
    });
  }

  async getBalanceByPersonId(userId: string, personId: string) {
    const transactions = await prisma.transaction.findMany({
      where: {
        userId,
        personId,
        status: "PENDING",
        type: { in: ["LENT", "BORROWED"] },
      },
    });

    let net = 0;
    for (const tx of transactions) {
      const val = Number(tx.amount);
      if (tx.type === "LENT") {
        net += val;
      } else if (tx.type === "BORROWED") {
        net -= val;
      }
    }

    return net;
  }

  async getTransactionsByPersonId(userId: string, personId: string) {
    return prisma.transaction.findMany({
      where: { userId, personId },
      include: {
        person: true,
        place: true,
        parent: true,
        partialPayments: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async delete(id: string) {
    return prisma.transaction.delete({
      where: { id },
    });
  }

  async getSummary(userId: string) {
    const aggregations = await prisma.transaction.groupBy({
      by: ["type", "status"],
      where: { userId },
      _sum: {
        amount: true,
      },
    });

    let totalExpense = 0;
    let totalLentPending = 0;     // Owed to me
    let totalBorrowedPending = 0; // Owed by me

    for (const agg of aggregations) {
      const sum = Number(agg._sum.amount || 0);
      if (agg.type === "EXPENSE") {
        totalExpense += sum;
      } else if (agg.type === "LENT" && agg.status === "PENDING") {
        totalLentPending += sum;
      } else if (agg.type === "BORROWED" && agg.status === "PENDING") {
        totalBorrowedPending += sum;
      }
    }

    return {
      totalExpense,
      totalLentPending,
      totalBorrowedPending,
    };
  }
}
