import mongoose, { Schema, Document } from 'mongoose';

export interface IOrderItem {
  menuItemId: mongoose.Types.ObjectId;
  quantity: number;
  price: number;
  subtotal: number;
  notes?: string;
  status: string;
}

export interface IOrder extends Document {
  orderNumber: string;
  outletId: mongoose.Types.ObjectId;
  tableId?: mongoose.Types.ObjectId;
  orderType: 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY' | 'QR_ORDER';
  status: 'PENDING' | 'CONFIRMED' | 'PREPARING' | 'READY' | 'SERVED' | 'COMPLETED' | 'CANCELLED';
  customerName?: string;
  customerPhone?: string;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  notes?: string;
  createdById: mongoose.Types.ObjectId;
  orderItems: IOrderItem[];
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const OrderItemSchema = new Schema<IOrderItem>({
  menuItemId: { type: Schema.Types.ObjectId, ref: 'MenuItem', required: true },
  quantity: { type: Number, required: true },
  price: { type: Number, required: true },
  subtotal: { type: Number, required: true },
  notes: { type: String },
  status: {
    type: String,
    enum: ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'SERVED', 'COMPLETED', 'CANCELLED'],
    default: 'PENDING',
  },
}, { _id: true });

const OrderSchema = new Schema<IOrder>(
  {
    orderNumber: { type: String, required: true, unique: true },
    outletId: { type: Schema.Types.ObjectId, ref: 'Outlet', required: true },
    tableId: { type: Schema.Types.ObjectId, ref: 'Table' },
    orderType: {
      type: String,
      enum: ['DINE_IN', 'TAKEAWAY', 'DELIVERY', 'QR_ORDER'],
      required: true,
    },
    status: {
      type: String,
      enum: ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'SERVED', 'COMPLETED', 'CANCELLED'],
      default: 'PENDING',
    },
    customerName: { type: String },
    customerPhone: { type: String },
    subtotal: { type: Number, required: true },
    tax: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    total: { type: Number, required: true },
    notes: { type: String },
    createdById: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    orderItems: [OrderItemSchema],
    completedAt: { type: Date },
  },
  {
    timestamps: true,
  }
);

OrderSchema.index({ outletId: 1 });
OrderSchema.index({ tableId: 1 });
OrderSchema.index({ orderNumber: 1 });
OrderSchema.index({ status: 1 });
OrderSchema.index({ createdAt: -1 });

export default mongoose.models.Order || mongoose.model<IOrder>('Order', OrderSchema);

