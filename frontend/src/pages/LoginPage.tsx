import { useTheme } from '../ThemeContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../components/ui/card';
import { Alert, AlertTitle, AlertDescription } from '../components/ui/alert';

const LoginPage = () => {
  const { isDarkTheme } = useTheme();
  const [error, setError] = React.useState('');

  return (
    <div className={`min-h-screen flex items-center justify-center ${isDarkTheme ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">
            Welcome to Cloud Hub
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertTitle>Authentication Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <Input 
            placeholder="Username" 
            className="dark:bg-gray-800 dark:border-gray-700"
          />
          <Input
            type="password"
            placeholder="Password"
            className="dark:bg-gray-800 dark:border-gray-700"
          />
          <Button 
            variant="default" 
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            Sign In
          </Button>
        </CardContent>
        <CardFooter className="flex justify-center">
          <p className={`text-sm ${isDarkTheme ? 'text-gray-400' : 'text-gray-600'}`}>
            Don't have an account? Contact your administrator
          </p>
        </CardFooter>
      </Card>
    </div>
  );
};