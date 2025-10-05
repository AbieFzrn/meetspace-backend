import { registerDecorator, ValidationOptions, ValidationArguments } from 'class-validator';

export function IsTimeString(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isTimeString',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          // format HH:mm atau HH:mm:ss
          return (
            typeof value === 'string' &&
            /^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/.test(value)
          );
        },
        defaultMessage() {
          return '$property must be a valid time string (HH:mm or HH:mm:ss)';
        },
      },
    });
  };
}
