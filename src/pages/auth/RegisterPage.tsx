import { Alert, Card, Title, Anchor, Text } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';

import { PATHS } from '@app/routes/paths';
import { SchemaForm } from '@components/forms/SchemaForm';
import { useSignup } from '@features/auth/api';
import { useDocumentTitle } from '@hooks/useDocumentTitle';
import requestsSchema from '@schemas/requests.json';
import { useAuthStore } from '@state/authStore';
import { getErrorMessage } from '@utils/error';

import type { SignupRequest } from '@api/models';
import type { JSONSchema7 } from 'json-schema';

const getSignupSchema = (): JSONSchema7 => {
  const schema = (requestsSchema as Record<string, JSONSchema7>)['SignupRequest'];
  if (!schema) throw new Error('SignupRequest schema not found in requests.json');
  return schema;
};

const RegisterPage: React.FC = () => {
  useDocumentTitle('Register - GradeFlow');
  const setTokens = useAuthStore((s) => s.setTokens);
  const schema = useMemo(() => getSignupSchema(), []);

  const uiSchema = useMemo(
    () => ({
      'ui:title': '',
      'ui:options': { label: true },
      email: { 'ui:widget': 'email', 'ui:options': { inputType: 'email' } },
      password: { 'ui:widget': 'password', 'ui:options': { inputType: 'password' } },
    }),
    []
  );

  const { mutateAsync, isPending, isError, error } = useSignup();

  return (
    <Card withBorder shadow="sm" w={400} p="xl">
        <Title order={2} mb="lg" ta="center">Register</Title>

        <SchemaForm<SignupRequest>
          schema={schema}
          uiSchema={uiSchema}
          isSubmitting={isPending}
          onSubmit={({ formData }) => {
            if (!formData) return;
            void mutateAsync(formData).then((tokenPair) => {
              setTokens(tokenPair);
              notifications.show({ color: 'green', message: 'Signup successful' });
            });
          }}
          formProps={{ noHtml5Validate: true }}
        />

        {isError && (
          <Alert color="red" mt="sm">{getErrorMessage(error)}</Alert>
        )}

        <Text size="sm" ta="center" mt="md">
          Already have an account?{' '}
          <Anchor component={Link} to={PATHS.LOGIN}>Login</Anchor>
        </Text>
    </Card>
  );
};

export default RegisterPage;
