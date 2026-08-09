import { LedgerRepository } from "./ledger.repository";
import { prisma } from "../../infrastructure/database/prisma.client";

export class LedgerService {
  constructor(private ledgerRepository: LedgerRepository) {}

  async addTransaction(
    userId: string,
    data: {
      personId?: string | null;
      placeId?: string | null;
      amount: number;
      type: "EXPENSE" | "LENT" | "BORROWED";
      description: string;
      category?: string | null;
      dueDate?: Date | null;
    },
    timezoneOffsetMinutes: number = 0
  ) {
    // 1. Validations
    if (data.type === "LENT" || data.type === "BORROWED") {
      if (!data.personId) {
        throw new Error("A contact person must be linked for Lent or Borrowed transactions.");
      }
    }

    if (data.personId) {
      const contact = await prisma.person.findUnique({ where: { id: data.personId } });
      if (!contact || contact.userId !== userId) {
        throw new Error("Linked contact profile not found or access denied.");
      }
    }

    if (data.placeId) {
      const place = await prisma.place.findUnique({ where: { id: data.placeId } });
      if (!place || place.userId !== userId) {
        throw new Error("Linked place not found or access denied.");
      }
    }

    // Force positive values
    const cleanAmount = Math.abs(data.amount);

    // 2. Database Creation
    const tx = await this.ledgerRepository.createTransaction({
      userId,
      personId: data.personId,
      placeId: data.placeId,
      amount: cleanAmount,
      type: data.type,
      description: data.description,
      category: data.category,
      dueDate: data.dueDate,
    });

    // 3. Register due date trigger if applicable (remind at 9:00 AM on due date in local client time)
    if (tx.dueDate && (tx.type === "LENT" || tx.type === "BORROWED")) {
      try {
        const triggerTime = new Date(tx.dueDate);
        
        // Compute the UTC time corresponding to 9:00 AM in the client's timezone offset
        const year = triggerTime.getUTCFullYear();
        const month = triggerTime.getUTCMonth();
        const date = triggerTime.getUTCDate();
        
        const scheduledTime = new Date(Date.UTC(year, month, date, 9, 0, 0, 0));
        scheduledTime.setUTCMinutes(scheduledTime.getUTCMinutes() + timezoneOffsetMinutes);

        await prisma.trigger.create({
          data: {
            type: "TIME",
            scheduledTime,
            transactionId: tx.id,
            personId: tx.personId,
          },
        });
      } catch (err) {
        console.error("[LedgerService] Failed to schedule payment follow-up trigger:", err);
      }
    }

    return tx;
  }

  async getTransactions(userId: string) {
    return this.ledgerRepository.findAllByUserId(userId);
  }

  async getPersonBalanceAndLogs(userId: string, personId: string) {
    // Verify contact access
    const contact = await prisma.person.findUnique({ where: { id: personId } });
    if (!contact || contact.userId !== userId) {
      throw new Error("Contact profile not found.");
    }

    const netBalance = await this.ledgerRepository.getBalanceByPersonId(userId, personId);
    const transactions = await this.ledgerRepository.getTransactionsByPersonId(userId, personId);

    return {
      netBalance,
      transactions,
    };
  }

  async settleTransaction(id: string, paidAmount?: number) {
    const transaction = await this.ledgerRepository.findById(id);
    if (!transaction) {
      throw new Error("Transaction log not found.");
    }

    const currentAmount = Number(transaction.amount);

    // Full Settle if paidAmount is omitted or matches/exceeds remaining amount
    if (paidAmount === undefined || paidAmount >= currentAmount) {
      return this.ledgerRepository.updateStatus(id, "SETTLED", new Date());
    }

    // Partial Settle: paidAmount is less than remaining amount
    const cleanPaid = Math.abs(paidAmount);
    const remainingAmount = currentAmount - cleanPaid;

    // 1. Update the parent transaction amount
    await this.ledgerRepository.updateAmount(id, remainingAmount);

    // 2. Create the child log representing the paid sub-payment
    await this.ledgerRepository.createTransaction({
      userId: transaction.userId,
      personId: transaction.personId,
      placeId: transaction.placeId,
      amount: cleanPaid,
      type: transaction.type,
      description: `Partial payment for: ${transaction.description}`,
      category: transaction.category,
      parentId: transaction.id,
      status: "SETTLED",
      settledAt: new Date(),
    });

    // Return the updated parent transaction
    return this.ledgerRepository.findById(id);
  }

  async splitExpense(
    userId: string,
    data: {
      totalAmount: number;
      description: string;
      placeId?: string | null;
      splits: Array<{ personId: string; amount: number }>;
    }
  ) {
    const cleanTotal = Math.abs(data.totalAmount);
    const splitsSum = data.splits.reduce((acc, s) => acc + Math.abs(s.amount), 0);

    if (splitsSum > cleanTotal) {
      throw new Error("Split shares total cannot exceed the total expense amount.");
    }

    const myShare = cleanTotal - splitsSum;
    const created: any[] = [];

    // 1. Save user's own share as an EXPENSE
    if (myShare > 0) {
      const userTx = await this.ledgerRepository.createTransaction({
        userId,
        placeId: data.placeId,
        amount: myShare,
        type: "EXPENSE",
        description: `${data.description} (My Share)`,
        status: "SETTLED",
        settledAt: new Date(),
      });
      created.push(userTx);
    }

    // 2. Save each split contact's share as a pending LENT (owed to me) transaction
    for (const split of data.splits) {
      const splitTx = await this.ledgerRepository.createTransaction({
        userId,
        personId: split.personId,
        placeId: data.placeId,
        amount: Math.abs(split.amount),
        type: "LENT",
        description: `${data.description} (Split Share)`,
        status: "PENDING",
      });
      created.push(splitTx);
    }

    return created;
  }

  async getLedgerSummary(userId: string) {
    return this.ledgerRepository.getSummary(userId);
  }

  async removeTransaction(id: string) {
    return this.ledgerRepository.delete(id);
  }
}
