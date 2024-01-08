import * as TE from "fp-ts/TaskEither"
import * as O from "fp-ts/Option"

import { IMPORTER_INVALID_FILE_FORMAT } from "."
import { safeParseJSON } from "~/helpers/functional/json"

import { z } from "zod"

const postmanEnvSchema = z.object({
  name: z.string(),
  values: z.array(
    z.object({
      key: z.string(),
      value: z.string(),
    })
  ),
})

type PostmanEnv = z.infer<typeof postmanEnvSchema>

export const postmanEnvImporter = (contents: string[]) => {
  const parsedContents = contents.map((str) => safeParseJSON(str, true))
  if (parsedContents.some((parsed) => O.isNone(parsed))) {
    return TE.left(IMPORTER_INVALID_FILE_FORMAT)
  }

  const parsedValues = parsedContents.flatMap((parsed) => {
    const unwrappedEntry = O.toNullable(parsed) as PostmanEnv[] | null

    if (unwrappedEntry) {
      return unwrappedEntry.map((entry) => ({
        ...entry,
        values: entry.values?.map((valueEntry) => ({
          ...valueEntry,
          value: String(valueEntry.value),
        })),
      }))
    }
    return null
  })

  const validationResult = z.array(postmanEnvSchema).safeParse(parsedValues)

  if (!validationResult.success) {
    return TE.left(IMPORTER_INVALID_FILE_FORMAT)
  }

  // Convert `values` to `variables` to match the format expected by the system
  const environments = validationResult.data.map((env) => ({
    ...env,
    variables: env.values,
  }))

  return TE.right(environments)
}
