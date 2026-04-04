import { Group, Button, Anchor, Text } from '@mantine/core';
import { Link } from 'react-router-dom';

const PublicNavbar: React.FC = () => (
  <Group h="100%" px="md" justify="space-between">
    <Anchor component={Link} to="/" underline="never">
      <Text fw={800} size="xl" c="blue">GradeFlow</Text>
    </Anchor>
    <Group gap="sm">
      <Button component={Link} to="/login" variant="default" size="sm">Log in</Button>
      <Button component={Link} to="/register" size="sm">Register</Button>
    </Group>
  </Group>
);
export default PublicNavbar;
