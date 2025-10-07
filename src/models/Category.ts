import mongoose, { Schema, Document } from 'mongoose';

export interface ICategory extends Document {
  masterId?: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  imageUrl?: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CategorySchema = new Schema<ICategory>(
  {
    masterId: { type: Schema.Types.ObjectId, ref: 'MenuMaster' },
    name: { type: String, required: true },
    description: { type: String },
    imageUrl: { type: String },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
);

CategorySchema.index({ sortOrder: 1 });
CategorySchema.index({ masterId: 1 });

export default mongoose.models.Category || mongoose.model<ICategory>('Category', CategorySchema);

