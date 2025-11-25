import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { api } from '@api';
import { SchemaForm } from '@components/common/forms/SchemaForm';
import PageCard from '@components/common/PageCard';
import ErrorAlert from '@components/common/ErrorAlert';
import { useAuthStore } from '@state/authStore';
import requestsSchema from '@schemas/requests.json';
import type { SignupRequest, TokenPairResponse } from '@api/models';
import { useDocumentTitle } from '@hooks/useDocumentTitle';

const getSignupSchema = () => {
  const schema = (requestsSchema as any)['SignupRequest'];
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

  const { mutateAsync, isPending, isError, error, isSuccess } = useMutation({
    mutationKey: ['auth', 'signup'],
    mutationFn: async (payload: SignupRequest) => {
      const res = await api.signupAuthSignupPost(payload);
      return res.data as TokenPairResponse;
    },
    onSuccess: (tokenPair) => {
      setTokens(tokenPair);
      // ProtectedRoute will redirect to /assessments
    },
  });

  return (
    <PageCard title="Register">
      <SchemaForm<SignupRequest>
        schema={schema}
        uiSchema={uiSchema}
        onSubmit={async ({ formData }) => {
          await mutateAsync(formData);
        }}
        formProps={{ noHtml5Validate: true }}
      />

      <div className="mt-4">
        {isPending && (
          <div className="alert alert-info">
            <span>Creating your account...</span>
          </div>
        )}
        {isError && <ErrorAlert error={error} />}
        {isSuccess && (
          <div className="alert alert-success">
            <span>Signup successful!</span>
          </div>
        )}
      </div>

      <div className="mt-4 text-sm text-center">
        <span className="mr-1">Already have an account?</span>
        <Link to="/login" className="link link-primary">
          Login
        </Link>
      </div>
    </PageCard>
  );
};

export default RegisterPage;