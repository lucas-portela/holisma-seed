# uDraft - Write Once, Use Everywhere

uDraft is a language and stack agnostic code-generation tool that simplifies full-stack development by converting a single YAML file into code for rapid development. In the YAML file, you define models, enums, API endpoints, and validation rules, and uDraft automatically generates classes, database schemas, DTOs, API infrastructure, and even client APIs. This cuts down on repetitive coding and keeps everything consistent.

Using modular renderers, uDraft produces different outputs from the same source. For example, it can create:

TypeScript classes with class-validator decorators for Nest.js
Mongoose schemas for MongoDB
Plain models or client APIs for front-end applications
Its flexible pipeline lets teams add custom renderers (for GraphQL, OpenAPI docs, ORMs, etc.) or use built-in ones. Unlike rigid scaffolding tools, uDraft separates the architecture design from the implementation details, allowing you to maintain one source of truth for your domain logic while easily updating services, databases, and clients.

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

| Renderer                   | Output                           |
| -------------------------- | -------------------------------- |
| `TSClassRenderer`          | TypeScript classes               |
| `TSClassValidatorRenderer` | TypeScript Validation decorators |
| `TSMongooseSchemaRenderer` | TypeScript MongoDB schemas       |
| `TSApiClientRenderer`      | TypeScript API Client With Axios |
| `DartClassRenderer`        | Dart classes                     |
| `DartApiClientRenderer`    | Dart API Client With Axios       |

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
