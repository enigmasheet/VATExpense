I want you to improve the organization and maintainability of my existing Next.js page/codebase.

IMPORTANT:

Do NOT completely convert the application to a new feature-based architecture.

Do NOT introduce a large new folder hierarchy.

Do NOT move everything into `features/`.

Do NOT rewrite working code just for architectural preference.

The current architecture is already working. I want an incremental refactoring of the EXISTING structure.

Use the uploaded/current code as the source of truth.

==================================================

GOAL

==================================================

The current page has become too large because it contains several responsibilities together, such as:

\- page/layout UI

\- API calls

\- React Query queries

\- React Query mutations

\- cache invalidation

\- form state

\- filtering/search state

\- table configuration

\- dialogs

\- slide-over forms

\- delete handling

\- validation

\- business logic

I want to separate these responsibilities into sensible files while preserving the current project architecture.

The result should be:

```
Page

  ↓

Page-level sections/components

  ↓

Hooks / API functions / small helpers
```

NOT:

```
Page

  ↓

Huge feature architecture

  ↓

Multiple unnecessary abstraction layers
```

==================================================

FIRST: INSPECT BEFORE CHANGING

==================================================

Before modifying anything:

1\. Inspect the current project structure.

2\. Inspect the uploaded page completely.

3\. Inspect nearby pages with similar functionality.

4\. Inspect existing:

- hooks

- services

- API utilities

- React Query setup

- query keys

- shared components

- form components

- table components

- validation

- types

5\. Identify conventions already used by this codebase.

Follow the EXISTING conventions.

Do not create a new architecture if the project already has an equivalent pattern.

==================================================

IMPORTANT ARCHITECTURAL RULE

==================================================

Improve the current architecture rather than replacing it.

For example, if the project currently uses:

```
app/

components/

hooks/

services/

lib/

types/
```

then continue using that structure.

Do NOT automatically introduce:

```
features/

    categories/

        components/

        hooks/

        services/

        types/

        schemas/

        utils/
```

unless the existing project already follows that pattern.

==================================================

HOW TO SPLIT THE CURRENT PAGE

==================================================

The page should primarily handle:

\- page layout

\- page-level composition

\- coordination between major sections

For example:

```
CategoriesPage

    ├── PageHeader

    ├── Categories section

    └── Item Categories section
```

The page should NOT contain hundreds of lines of implementation details.

==================================================

1\. EXTRACT LARGE UI SECTIONS

==================================================

If the current page contains clearly separate sections, extract them into components.

For example:

```
components/categories/

    CategoriesSection.tsx

    ItemCategorySection.tsx
```

OR, if the existing project uses a flatter component structure:

```
components/CategoriesSection.tsx

components/ItemCategorySection.tsx
```

Choose whichever matches the existing codebase.

Do NOT create unnecessary files for tiny pieces of JSX.

A component deserves its own file when it has:

\- substantial JSX

\- its own state

\- its own event handling

\- its own query/mutation usage

\- independent business/UI responsibility

\- likely reuse

Do NOT extract simple wrappers or 5-line pieces just to reduce line count.

==================================================

2\. EXTRACT API CALLS

==================================================

If the page currently contains calls such as:

```
api("/api/categories", ...)

api`/api/categories/${id}`, ...)

api("/api/item-categories", ...)
```

move those API calls into the EXISTING service/API pattern.

For example, if the project already has:

```
services/categoryService.ts
```

extend that file.

Do NOT create another abstraction if a suitable service already exists.

The component should ideally not know endpoint URLs.

Prefer:

```
createCategory(...)

updateCategory(...)

deleteCategory(...)
```

instead of:

```
api("/api/categories", ...)
```

inside UI components.

==================================================

3\. EXTRACT REACT QUERY LOGIC

==================================================

If the page contains large React Query logic, move it into the existing hooks pattern.

For example:

```
hooks/useCategories.ts
```

or whatever naming convention the project already uses.

Queries:

```
useCategories(companyId)

useItemCategories(companyId)
```

Mutations can either be:

```
useCategoryMutations.ts
```

or kept near the query hook if that is already the project's convention.

Do not create separate files for every single mutation unless the project actually benefits from it.

==================================================

4\. KEEP QUERY KEYS CONSISTENT

==================================================

Do not introduce a new query-key architecture if one already exists.

If the project currently uses:

```
queryKeys.categories(companyId)
```

continue using it.

Company-specific data MUST include companyId in the query key.

Correct:

```
\["categories", companyId\]
```

Incorrect:

```
\["categories"\]
```

because this is a multi-company application.

Do not change this behavior during the refactor.

==================================================

5\. MOVE FORM STATE ONLY WHEN IT BELONGS TO THE FORM

==================================================

If the page currently contains state like:

```
categoryFormOpen

categoryName

categoryMode

editingCategory

categoryError
```

and this state is only used by the category form,

move that state into the category form/section component.

Likewise, if the page contains:

```
itemCategoryFormOpen

itemCategoryName

itemCategoryMode

editingItemCategory

itemCategoryError
```

move that state closer to the item-category form.

Do NOT move state blindly.

Keep state at the highest level where it is actually required.

==================================================

6\. DO NOT OVER-SPLIT DELETE DIALOGS

==================================================

If there is a generic:

```
ConfirmDialog
```

do not automatically create:

```
DeleteCategoryDialog.tsx

DeleteItemCategoryDialog.tsx
```

unless those dialogs contain meaningful logic.

It is perfectly acceptable for a section component to contain:

```
const \[deleteTarget, setDeleteTarget\] = useState(...)
```

and render the shared ConfirmDialog.

The goal is clean responsibility, not maximum file count.

==================================================

7\. EXTRACT TABLE CONFIGURATION WHEN LARGE

==================================================

If the page contains a large:

```
&lt;DataTable

    columns={\[ ... \]}

/&gt;
```

configuration, consider moving the table into:

```
CategoriesTable.tsx
```

if it contains:

\- many columns

\- action buttons

\- formatting

\- filtering

\- callbacks

\- substantial rendering logic

Do NOT create a separate `columns.ts` file unless the column definitions are large enough or reused.

Prefer keeping related table configuration close to its table component.

==================================================

8\. KEEP SEARCH/FILTER STATE LOCAL

==================================================

If search is only used by one section:

```
const \[search, setSearch\] = useState("");
```

keep it inside that section/table component.

Do not keep every piece of UI state in the page component.

However, if the search value controls multiple independent sections, keep it at the common parent.

Use the smallest reasonable state scope.

==================================================

9\. TYPES

==================================================

If the page contains interfaces/types that are reused by:

\- hooks

\- services

\- multiple components

move them into the existing types location.

If a type is only used by one component, it can remain inside that component.

Do NOT create a separate file for every interface.

For example, avoid:

```
Category.ts

ItemCategory.ts

CategoryForm.ts

DeleteTarget.ts
```

unless these types are sufficiently complex or shared.

A reasonable:

```
types/category.ts
```

or existing project equivalent is preferred.

==================================================

10\. VALIDATION

==================================================

If validation already exists in the project:

```
Zod

Yup

custom validation

React Hook Form
```

reuse the existing approach.

Do not introduce another validation library.

If the form is simple and current inline validation is clean, do not unnecessarily extract it.

==================================================

11\. REACT QUERY CACHE

==================================================

Preserve the existing React Query architecture.

Do not replace React Query.

Do not manually introduce localStorage caching inside components.

If caching improvements are needed, use React Query's existing cache.

For example:

```
staleTime

gcTime

queryKey

invalidateQueries
```

should remain centralized according to the existing architecture.

The refactoring must NOT result in duplicate API requests.

==================================================

12\. MUTATION INVALIDATION

==================================================

Mutation logic should own its cache invalidation where practical.

For example:

```
createCategory()

    ↓

invalidate categories query

updateCategory()

    ↓

invalidate categories query

deleteCategory()

    ↓

invalidate categories query
```

If item-category changes affect categories or another related query, invalidate the appropriate related query as well.

Do not move cache invalidation into random UI components unless the existing architecture requires it.

==================================================

13\. COMPONENT RESPONSIBILITY

==================================================

Use this general rule:

PAGE:

```
layout + composition
```

SECTION:

```
section-specific UI + local state
```

TABLE:

```
table rendering + table-specific interaction
```

FORM:

```
form state + form UI + submission
```

HOOK:

```
React Query / data state
```

SERVICE:

```
API communication
```

SHARED UI:

```
generic reusable components
```

Do not create additional layers unless they solve a real problem.

==================================================

14\. EXAMPLE OF DESIRED RESULT

==================================================

If the current structure looks like:

```
app/

    categories/

        page.tsx

components/

    ...

hooks/

    ...

services/

    ...
```

do something similar to:

```
app/

    categories/

        page.tsx

components/

    categories/

        CategoriesSection.tsx

        CategoriesTable.tsx

        CategoryForm.tsx

        ItemCategorySection.tsx

        ItemCategoryTable.tsx

        ItemCategoryForm.tsx

hooks/

    useCategories.ts

    useItemCategories.ts

services/

    categoryService.ts

    itemCategoryService.ts

types/

    category.ts
```

BUT:

This is only an example.

Use the existing project's structure and naming conventions.

If the project already has:

```
components/Categories.tsx
```

then improve that structure rather than introducing an entirely different system.

==================================================

15\. KEEP RELATED CODE TOGETHER

==================================================

Do not separate code purely by technical type if that makes navigation harder.

For example, if a table has:

```
columns

formatting

action handlers

row actions
```

keep them together when practical.

Avoid jumping between:

```
components/

columns/

handlers/

config/

utils/
```

for a simple table.

A developer should be able to understand one feature without opening 15 files.

==================================================

16\. AVOID GENERIC CRUD ABSTRACTIONS

==================================================

Do NOT create:

```
useCrud()

GenericCrud()

CrudPage()

GenericEntityForm()

GenericMutation()
```

unless the existing project already has a successful abstraction for this.

Categories, locations, trucks, parties, etc. may look similar but often have different business rules.

Prefer simple explicit code over a complicated generic abstraction.

==================================================

17\. DO NOT CHANGE BUSINESS BEHAVIOR

==================================================

This is primarily a code-organization/refactoring task.

Preserve:

\- API endpoints

\- API payloads

\- API response handling

\- authentication

\- authorization

\- companyId handling

\- tenant isolation

\- React Query behavior

\- validation

\- toast messages

\- loading states

\- error states

\- table behavior

\- filtering

\- sorting

\- CRUD behavior

\- UI appearance

Do not redesign the UI unless required.

Do not change business rules.

==================================================

18\. APPLY THE SAME PATTERN TO SIMILAR PAGES

==================================================

After refactoring the current page, inspect similar pages such as:

```
/locations

/trucks

/parties

/categories

/packaging

/carriers
```

Identify repeated structural problems.

Do NOT refactor every page automatically.

Instead, establish a consistent lightweight pattern that can be reused.

If a similar page is already well organized, follow its pattern.

==================================================

19\. IMPORTANT: MINIMIZE FILE CHANGES

==================================================

Prefer modifying existing files over creating new files when the existing file already has the correct responsibility.

Do not create:

```
10 new files
```

when:

```
3 well-chosen files
```

would solve the problem.

The goal is:

```
fewer responsibilities per file
```

NOT:

```
more files.
```

==================================================

20\. FINAL CODE QUALITY CHECK

==================================================

After refactoring, verify:

\- TypeScript passes

\- ESLint passes

\- production build passes

\- no unused imports

\- no circular dependencies

\- no duplicate API functions

\- no duplicate query keys

\- no duplicate QueryClient

\- no broken imports

\- no changed API contracts

\- no tenant/company data leakage

\- no unnecessary API requests

\- no regression in CRUD operations

==================================================

FINAL RESPONSE

==================================================

After completing the refactor, show:

1\. Current structure BEFORE.

2\. Improved structure AFTER.

3\. Files created.

4\. Files modified.

5\. Files intentionally left unchanged.

6\. Why each file was separated.

7\. What responsibilities remain in the page.

8\. What responsibilities moved to hooks/services/components.

9\. Any architectural issues you found but intentionally did not change.

10\. TypeScript/build/test results.

Most importantly:

DO NOT turn this into a complete feature-based architecture migration.

This is an incremental improvement to the CURRENT architecture.

Think:

```
"Improve what already exists"
```

not:

```
"Replace the architecture."
```

Use the existing codebase's conventions as the highest priority.
