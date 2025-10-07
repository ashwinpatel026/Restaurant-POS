import mongoose, { Schema, Document } from 'mongoose';

export interface IPayment extends Document {
  orderId: mongoose.Types.ObjectId;
  amount: number;
  paymentMethod: 'CASH' | 'CARD' | 'UPI' | 'WALLET';
  paymentStatus: 'PENDING' | 'COMPLETED' | 'FAILED';
  transactionId?: string;
  paidAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema = new Schema<IPayment>(
  {
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true, unique: true },
    amount: { type: Number, required: true },
    paymentMethod: {
      type: String,
      enum: ['CASH', 'CARD', 'UPI', 'WALLET'],
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ['PENDING', 'COMPLETED', 'FAILED'],
      default: 'PENDING',
    },
    transactionId: { type: String },
    paidAt: { type: Date },
  },
  {
    timestamps: true,
  }
);

PaymentSchema.index({ orderId: 1 });
PaymentSchema.index({ paymentStatus: 1 });

export default mongoose.models.Payment || mongoose.model<IPayment>('Payment', PaymentSchema);

