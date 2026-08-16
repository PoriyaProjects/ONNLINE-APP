import { TRAINING_ERROR_MESSAGE_HE, TrainingApiResult, TrainingErrorCodes } from '../models';

export function trainingErrorMessage(
  result: Pick<TrainingApiResult<unknown>, 'ErrorCode' | 'Message'> | null | undefined,
  fallback: string = 'אירעה שגיאה. נסה שוב.'
): string {
  if (!result) {
    return fallback;
  }
  const code = result.ErrorCode;
  if (code && TRAINING_ERROR_MESSAGE_HE[code]) {
    return TRAINING_ERROR_MESSAGE_HE[code];
  }
  if (result.Message && String(result.Message).trim() !== '') {
    return String(result.Message);
  }
  return fallback;
}

export function httpFailureMessage(): string {
  return TRAINING_ERROR_MESSAGE_HE[TrainingErrorCodes.Conflict]
    ? 'לא ניתן להתחבר לשרת. בדוק את החיבור ונסה שוב.'
    : 'לא ניתן להתחבר לשרת. בדוק את החיבור ונסה שוב.';
}
