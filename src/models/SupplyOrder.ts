import mongoose, { Schema, Document } from 'mongoose';

export interface ICentralKitchen extends Document {
  name: string;
  address: string;
  phone: string;
  email: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ISupplyOrderItem {
  rawMaterialId: mongoose.Types.ObjectId;
  quantity: number;
  receivedQty: number;
}

export interface ISupplyOrder extends Document {
  orderNumber: string;
  outletId: mongoose.Types.ObjectId;
  centralKitchenId: mongoose.Types.ObjectId;
  status: 'PENDING' | 'CONFIRMED' | 'PREPARING' | 'DISPATCHED' | 'DELIVERED' | 'CANCELLED';
  requestedDate: Date;
  deliveryDate?: Date;
  notes?: string;
  items: ISupplyOrderItem[];
  createdAt: Date;
  updatedAt: Date;
}

const CentralKitchenSchema = new Schema<ICentralKitchen>(
  {
    name: { type: String, required: true },
    address: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, required: true },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
);

const SupplyOrderItemSchema = new Schema<ISupplyOrderItem>({
  rawMaterialId: { type: Schema.Types.ObjectId, ref: 'RawMaterial', required: true },
  quantity: { type: Number, required: true },
  receivedQty: { type: Number, default: 0 },
}, { _id: true });

const SupplyOrderSchema = new Schema<ISupplyOrder>(
  {
    orderNumber: { type: String, required: true, unique: true },
    outletId: { type: Schema.Types.ObjectId, ref: 'Outlet', required: true },
    centralKitchenId: { type: Schema.Types.ObjectId, ref: 'CentralKitchen', required: true },
    status: {
      type: String,
      enum: ['PENDING', 'CONFIRMED', 'PREPARING', 'DISPATCHED', 'DELIVERED', 'CANCELLED'],
      default: 'PENDING',
    },
    requestedDate: { type: Date, required: true },
    deliveryDate: { type: Date },
    notes: { type: String },
    items: [SupplyOrderItemSchema],
  },
  {
    timestamps: true,
  }
);

SupplyOrderSchema.index({ outletId: 1 });
SupplyOrderSchema.index({ centralKitchenId: 1 });
SupplyOrderSchema.index({ status: 1 });

export const CentralKitchen = mongoose.models.CentralKitchen || mongoose.model<ICentralKitchen>('CentralKitchen', CentralKitchenSchema);
export const SupplyOrder = mongoose.models.SupplyOrder || mongoose.model<ISupplyOrder>('SupplyOrder', SupplyOrderSchema);

