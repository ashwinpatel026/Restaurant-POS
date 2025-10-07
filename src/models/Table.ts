import mongoose, { Schema, Document } from 'mongoose';

export interface ITable extends Document {
  outletId: mongoose.Types.ObjectId;
  tableNumber: string;
  capacity: number;
  status: 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'MAINTENANCE';
  qrCode: string;
  location?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const TableSchema = new Schema<ITable>(
  {
    outletId: { type: Schema.Types.ObjectId, ref: 'Outlet', required: true },
    tableNumber: { type: String, required: true },
    capacity: { type: Number, required: true },
    status: {
      type: String,
      enum: ['AVAILABLE', 'OCCUPIED', 'RESERVED', 'MAINTENANCE'],
      default: 'AVAILABLE',
    },
    qrCode: { type: String, required: true, unique: true },
    location: { type: String },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
);

TableSchema.index({ outletId: 1, tableNumber: 1 }, { unique: true });
TableSchema.index({ qrCode: 1 });
TableSchema.index({ status: 1 });

export default mongoose.models.Table || mongoose.model<ITable>('Table', TableSchema);

