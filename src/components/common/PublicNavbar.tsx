import { Group, Button, Anchor, Text } from '@mantine/core';
import { Link } from 'react-router-dom';

import { PATHS } from '@app/routes/paths';
import { useResolvedColorScheme } from '@hooks/useResolvedColorScheme';

const PublicNavbar: React.FC = () => {
  const colorScheme = useResolvedColorScheme();

  return (
    <Group h="100%" px="md" justify="space-between">
      <Anchor component={Link} to="/" underline="never">
        <Text fw={800} size="xl" c={colorScheme === 'dark' ? 'white' : 'black'}>GradeFlow</Text>
      </Anchor>
      <Group gap="sm">
        <Button component={Link} to={PATHS.LOGIN} variant="default" size="sm">Log in</Button>
        <Button component={Link} to={PATHS.REGISTER} size="sm">Register</Button>
      </Group>
    </Group>
  );
};

export default PublicNavbar;
