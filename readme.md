# uDraft - Write Once, Use Everywhere

uDraft is a declarative code-generation tool that streamlines full-stack development by transforming a single YAML blueprint into production-ready code. By defining models, enums, API endpoints, and validation rules in a structured YAML file, developers can automatically generate classes, database schemas, DTOs, and API infrastructure—eliminating boilerplate code while ensuring consistency across layers. uDraft’s modular renderers interpret the YAML differently to produce framework-specific outputs: generate TypeScript classes with class-validator decorators for Nest.js, Mongoose schemas for MongoDB, or plain models for frontend clients—all from the same source. Its extensible pipeline allows teams to add custom renderers (e.g., for GraphQL, OpenAPI docs, or ORMs) or reuse built-in ones, making it adaptable to any stack. Unlike rigid scaffolding tools, uDraft decouples architecture definitions from implementation details, enabling teams to maintain a single source of truth for their domain logic while effortlessly syncing changes across services, databases, and clients.

## 📜 Core Concepts

### Symbol Cheat Sheet

| Symbol | Purpose            | Example               |
| ------ | ------------------ | --------------------- |
| `/`    | Node attribute     | `/schema: accounts`   |
| `+`    | Model declaration  | `+user`               |
| `~`    | Enum declaration   | `~user-roles`         |
| `&`    | Reference by ID    | `owner[&user]`        |
| `>`    | Field renaming     | `passwordHash > pass` |
| `$`    | Special operations | `$pick`, `$remove`    |

## 🏗️ Basic Structure

### Draft Blueprint

```yaml
draft:
  /name: Project Name # Root attributes
  /version: 1.0

  module-name: # Component container
    ~enum-name: # Enum definition
      KEY: value
    +model-name: # Data model
      field[type]:
        - validation
    feature-name: # API endpoint
      /http: { method: post }
```

## 📦 Modules

**Logical grouping of related components**

```yaml
authentication:
  /description: User auth flows
  ~auth-methods: # Enum
    EMAIL: email
    GOOGLE: oauth2-google
```

## 🎚️ Enums

**Fixed value collections**

```yaml
~user-status:
  ACTIVE: active # Display : Storage
  PENDING: pending
  BANNED: banned
```

## 🧬 Models

### Base Model

```yaml
+timestamps:
  createdAt[date]:
    - required
  updatedAt[date]:
```

### Inherited Model

```yaml
+user(timestamps): # Parenthesis inheritance
  email[string]:
    - unique
    - format(email)
```

### Relationships

```yaml
posts[&post]: # ID reference (foreign key)
  - array
profile[user-profile]: # Embedded document
```

## 🔄 Model Transformations

```yaml
+user-dto(user): # Full inclusion: user-dto inherits all the user model fields
  $remove: # Field exclusion: remove fields declared in this model by name
    - passwordHash
    - __v

  $pick(user): # Selective inclusion: inherits only specific fields from user model
    - _id > id # Field renaming
    - email
```

## 🌐 Features (API Endpoints)

```yaml
/create-user:
  /http: { method: post, url: /users }
  input:
    +create-user-dto: # Declare new model for request adding some existing user fields
      $pick(user):
        - email
        - password
  output: user-dto # Use aleady declared user-dto model as is
```

## ✅ Field Validations

```yaml
age[int]:
  - min(13)
  - max(120)

password[string]:
  - minLength(8)
  - regex(/[A-Z]/)
```

## 🚀 Complete Example

```yaml
draft:
  /name: Blog Platform

  content:
    ~post-status:
      DRAFT: draft
      PUBLISHED: published

    +post:
      title[string]:
        - required
      content[string]:
        - minLength(100)
      status[post-status]:
        - required(false)

    create-post:
      /http: { method: post, url: /posts }
      input:
        +create-post-request(post):
          $remove:
            - status
      output: +post-response(post)
```

## 🛠️ Code Generation

### Pipeline Flow

1. **Parse YAML** - Load draft configuration
2. **Apply Renderers** - Transform components to code
3. **Generate Output** - Create files in target directories

### Built-in Renderers

| Renderer           | Output                           |
| ------------------ | -------------------------------- |
| `TSClassRenderer`  | TypeScript interfaces            |
| `ClassValidator`   | TypeScript Validation decorators |
| `MongooseRenderer` | MongoDB schemas                  |

### Custom Renderer

```typescript
// Custom GraphQL Renderer
class DartClassRenderer extends URenderer {
  async select(): Promise<RenderSelection> {
    const models: UModel[] = [];
    const paths: RenderPath[] = [];

    this.$models().forEach(({ model, module }) => {
      if (paths.some((p) => p.key === model.$name())) return;
      models.push(model);
      paths.push({
        key: model.$name(),
        path: `lib/models/${Case.pascal(mode.$name())}.dart`
        ),
      });
    });

    return {
      models,
      paths
    };
  }

  async render(): Promise<RenderContent[]> {
    const output: RenderContent[];
    this.$selection().models.forEach(model=>{
        let content = this.$content(model.$name());
        // Implement code generation
        output.push({
            key: model.$name(),
            content: content,
        })
    });
    return output;
  }
}

// Usage
UDraft.load("project.yaml").pipeline([new DartClassRenderer()]).exec();
```

## 📁 Sample Output

```typescript
// Generated MongoDB Schema
const PostSchema = new Schema({
  title: { type: String, required: true },
  content: { type: String, minLength: 100 },
  status: {
    type: String,
    enum: ["draft", "published"],
  },
});

// Generated TypeScript Interface
interface Post {
  title: string;
  content: string;
  status: "draft" | "published";
}
```

## 💡 Pro Tips

1. **Reuse Models**: Inherit common fields with `(parent-model)`
2. **API Safety**: Use `$remove` to exclude sensitive fields from DTOs
3. **Validation First**: Define rules in YAML for auto-generated checks
4. **Cross-References**: Use `&model` for database relations
5. **Renderer Stack**: Combine multiple renderers for full-stack generation
