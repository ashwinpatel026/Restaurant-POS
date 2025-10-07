import mongoose, { Schema, Document } from 'mongoose';

export interface IRawMaterial extends Document {
  name: string;
  description?: string;
  unit: string;
  reorderLevel: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IInventory extends Document {
  outletId: mongoose.Types.ObjectId;
  rawMaterialId: mongoose.Types.ObjectId;
  quantity: number;
  status: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'ORDERED';
  lastRestocked?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const RawMaterialSchema = new Schema<IRawMaterial>(
  {
    name: { type: String, required: true },
    description: { type: String },
    unit: { type: String, required: true },
    reorderLevel: { type: Number, required: true },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
);

const InventorySchema = new Schema<IInventory>(
  {
    outletId: { type: Schema.Types.ObjectId, ref: 'Outlet', required: true },
    rawMaterialId: { type: Schema.Types.ObjectId, ref: 'RawMaterial', required: true },
    quantity: { type: Number, required: true },
    status: {
      type: String,
      enum: ['IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK', 'ORDERED'],
      default: 'IN_STOCK',
    },
    lastRestocked: { type: Date },
  },
  {
    timestamps: true,
  }
);

InventorySchema.index({ outletId: 1, rawMaterialId: 1 }, { unique: true });
InventorySchema.index({ status: 1 });

export const RawMaterial = mongoose.models.RawMaterial || mongoose.model<IRawMaterial>('RawMaterial', RawMaterialSchema);
export const Inventory = mongoose.models.Inventory || mongoose.model<IInventory>('Inventory', InventorySchema);

