import requests
from bs4 import BeautifulSoup

# Create session to maintain cookies
session = requests.Session()

# Add realistic headers
headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
    'Accept-Encoding': 'gzip, deflate',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1'
}
session.headers.update(headers)

try:
    # Get login page first
    login_url = "https://plus.gobingoet.com/login"
    login_page = session.get(login_url)
    print(f"Login page status: {login_page.status_code}")
    
    # Parse login page to find form fields
    soup = BeautifulSoup(login_page.text, 'html.parser')
    
    # Find CSRF token if it exists
    csrf_token = None
    csrf_input = soup.find('input', {'name': '_token'}) or soup.find('input', {'name': 'csrf_token'}) or soup.find('input', {'name': 'authenticity_token'})
    if csrf_input:
        csrf_token = csrf_input.get('value')
        print(f"Found CSRF token: {csrf_token[:10]}...")
    
    # Login credentials
    login_data = {
        'username': 'TestshopS1',
        'password': '0987654321'
    }
    
    # Add CSRF token if found
    if csrf_token:
        login_data['_token'] = csrf_token
    
    # Submit login form
    response = session.post(login_url, data=login_data)
    print(f"Login response status: {response.status_code}")
    print(f"Redirected to: {response.url}")
    
    # Try to access dashboard
    dashboard_url = "https://plus.gobingoet.com/dashboard"
    dashboard = session.get(dashboard_url)
    print(f"Dashboard status: {dashboard.status_code}")
    
    if dashboard.status_code == 200:
        # Save dashboard HTML for analysis
        with open('dashboard.html', 'w', encoding='utf-8') as f:
            f.write(dashboard.text)
        print("Dashboard content saved to dashboard.html")
        
        # Try to explore other pages by checking the JavaScript app
        # Common bingo platform pages to try
        pages_to_explore = [
            '/game',
            '/play',
            '/bingo',
            '/games',
            '/profile',
            '/wallet',
            '/history',
            '/settings',
            '/admin',
            '/shop',
            '/cartela',
            '/cartelas'
        ]
        
        # Try to access the specific navigation pages you mentioned
        dashboard_pages = [
            '/dashboard',  # Main dashboard
            '/play',       # Play Bingo
            '/history',    # Win History  
            '/cartela',    # View Cartela
            '/settings'    # Settings
        ]
        
        print("\nExploring dashboard navigation pages...")
        for page in dashboard_pages:
            try:
                url = f"https://plus.gobingoet.com{page}"
                response = session.get(url, timeout=10)
                print(f"📄 {page}: Status {response.status_code}, Content length: {len(response.text)}")
                
                if response.status_code == 200:
                    # Save page content for analysis
                    filename = f"dashboard_{page.replace('/', '_')}.html"
                    with open(filename, 'w', encoding='utf-8') as f:
                        f.write(response.text)
                    print(f"   💾 Saved as {filename}")
                    
                    # Try to extract any navigation structure from the page
                    soup = BeautifulSoup(response.text, 'html.parser')
                    nav_elements = soup.find_all(['nav', 'aside', 'ul', 'div'], class_=lambda x: x and any(word in x.lower() for word in ['nav', 'menu', 'sidebar', 'side']))
                    if nav_elements:
                        print(f"   🧭 Found {len(nav_elements)} potential navigation elements")
                        
            except Exception as e:
                print(f"❌ {page}: Error {e}")
        
        # Also try hash-based routes (common in React SPAs)
        hash_routes = ['#/dashboard', '#/play', '#/history', '#/cartela', '#/settings']
        print("\nTrying hash-based routes...")
        for route in hash_routes:
            try:
                url = f"https://plus.gobingoet.com/{route}"
                response = session.get(url, timeout=5)
                print(f"📄 {route}: Status {response.status_code}")
            except Exception as e:
                print(f"❌ {route}: Error {e}")
        
        # Extract styling information from dashboard
        soup = BeautifulSoup(dashboard.text, 'html.parser')
        stylesheets = soup.find_all('link', {'rel': 'stylesheet'})
        print(f"\nFound {len(stylesheets)} stylesheets")
        
    else:
        print("Failed to access dashboard")
        
except Exception as e:
    print(f"Error: {e}")