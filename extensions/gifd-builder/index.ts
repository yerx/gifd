import { definePluginEntry } from "./api.js";
import { gifdBuilderConfigSchema } from "./src/config.js";
import { registerGifdBuilderPlugin } from "./src/plugin.js";

export default definePluginEntry({
  id: "gifd-builder",
  name: "Gifd App Builder",
  description:
    "Customize Gifd's apps from chat. The agent edits code in a draft sandbox; user accepts or discards.",
  configSchema: gifdBuilderConfigSchema,
  register: registerGifdBuilderPlugin,
});
