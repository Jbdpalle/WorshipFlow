import nextPlugin from "eslint-config-next";

const eslintConfig = [
  ...nextPlugin,
  {
    ignores: [".next/**", "node_modules/**", "prisma/generated/**"],
  },
];

export default eslintConfig;
