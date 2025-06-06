import { lintSource } from '@secretlint/core';
import { creator } from '@secretlint/secretlint-rule-preset-recommend';
import type { SecretLintCoreConfig } from '@secretlint/types';
import { logger, setLogLevelByEnv } from '../../../shared/logger.js';

export interface SecurityCheckTask {
  filePath: string;
  content: string;
}

export interface SuspiciousFileResult {
  filePath: string;
  messages: string[];
}

// Set logger log level from environment variable if provided
setLogLevelByEnv();

export default async ({ filePath, content }: SecurityCheckTask) => {
  const config = createSecretLintConfig();

  try {
    const processStartAt = process.hrtime.bigint();
    const secretLintResult = await runSecretLint(filePath, content, config);
    const processEndAt = process.hrtime.bigint();

    logger.trace(
      `Checked security on ${filePath}. Took: ${(Number(processEndAt - processStartAt) / 1e6).toFixed(2)}ms`,
    );

    return secretLintResult;
  } catch (error) {
    logger.error(`Error checking security on ${filePath}:`, error);
    throw error;
  }
};

export const runSecretLint = async (
  filePath: string,
  content: string,
  config: SecretLintCoreConfig,
): Promise<SuspiciousFileResult | null> => {
  const result = await lintSource({
    source: {
      filePath: filePath,
      content: content,
      ext: filePath.split('.').pop() || '',
      contentType: 'text',
    },
    options: {
      config: config,
    },
  });

  if (result.messages.length > 0) {
    logger.trace(`Found ${result.messages.length} issues in ${filePath}`);
    logger.trace(result.messages.map((message) => `  - ${message.message}`).join('\n'));

    return {
      filePath,
      messages: result.messages.map((message) => message.message),
    };
  }

  return null;
};

export const createSecretLintConfig = (): SecretLintCoreConfig => ({
  rules: [
    {
      id: '@secretlint/secretlint-rule-preset-recommend',
      rule: creator,
    },
  ],
});
