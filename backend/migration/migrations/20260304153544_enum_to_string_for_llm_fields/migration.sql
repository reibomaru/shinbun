-- Convert enum columns to text (preserving existing data)

-- entity.entity_type: EntityType enum -> text
ALTER TABLE "entity" ALTER COLUMN "entity_type" SET DATA TYPE TEXT;

-- item.item_type: ItemType enum -> text
ALTER TABLE "item" ALTER COLUMN "item_type" SET DATA TYPE TEXT;

-- item_label.label_type: LabelType enum -> text
ALTER TABLE "item_label" ALTER COLUMN "label_type" SET DATA TYPE TEXT;

-- Drop unused enum types
DROP TYPE IF EXISTS "EntityType";
DROP TYPE IF EXISTS "ItemType";
DROP TYPE IF EXISTS "LabelType";
