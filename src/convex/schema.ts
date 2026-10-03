import { defineSchema, defineTable } from "convex/server";
import { Infer, v } from "convex/values";

// default user roles. can add / remove based on the project as needed
export const ROLES = {
  ADMIN: "admin",
  USER: "user",
  MEMBER: "member",
} as const;

export const roleValidator = v.union(
  v.literal(ROLES.ADMIN),
  v.literal(ROLES.USER),
  v.literal(ROLES.MEMBER),
);
export type Role = Infer<typeof roleValidator>;

const schema = defineSchema(
  {
    pages: defineTable({
      slug: v.string(), // 8-char nanoid, unguessable, unique
      title: v.optional(v.string()),
      content: v.any(), // telegraph-style node tree: { tag, attrs, children } | string | array
      createdAt: v.number(),
      updatedAt: v.number(),
    }).index("by_slug", ["slug"]).index("by_creation", ["createdAt"]),
  },
  {
    schemaValidation: false,
  },
);

export default schema;
