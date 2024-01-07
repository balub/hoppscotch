import * as TE from "fp-ts/TaskEither"
import * as O from "fp-ts/Option"

import { IMPORTER_INVALID_FILE_FORMAT } from "."
import { safeParseJSON } from "~/helpers/functional/json"

import { z } from "zod"

const hoppEnvSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  variables: z.array(
    z.object({
      key: z.string(),
      value: z.string(),
    })
  ),
})

type HoppEnv = z.infer<typeof hoppEnvSchema>

export const hoppEnvImporter = (contents: string[]) => {
  const parsedContents = contents.map((str) => safeParseJSON(str, true))

  if (parsedContents.some((parsed) => O.isNone(parsed))) {
    return TE.left(IMPORTER_INVALID_FILE_FORMAT)
  }

  const parsedValues = parsedContents.flatMap((content) => {
    const unwrappedContent = O.toNullable(content) as HoppEnv[]

    return unwrappedContent.map((contentEntry) => {
      return {
        ...contentEntry,
        variables: contentEntry.variables.map((valueEntry) => ({
          ...valueEntry,
          value: String(valueEntry.value),
        })),
      }
    })
  })

  const validationResult = z.array(hoppEnvSchema).safeParse(parsedValues)

  if (!validationResult.success) {
    return TE.left(IMPORTER_INVALID_FILE_FORMAT)
  }

  const environments = validationResult.data

  return TE.right(environments)
}
