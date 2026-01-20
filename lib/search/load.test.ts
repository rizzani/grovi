/**
 * Load Test Suite for Search Service
 * 
 * Simulates concurrent users performing searches with filters and sorting
 * to verify query stability under load.
 * 
 * Run with: tsx lib/search/load.test.ts
 */

import { rankResults, RankingProduct, SortMode } from "./ranking";

// Load test configuration
const CONCURRENT_USERS = [1, 5, 10, 25, 50];
const QUERIES_PER_USER = 10;
const DATASET_SIZE = 1000;

interface LoadTestResult {
  product: RankingProduct;
  brand: string;
  category?: { $id: string; name: string };
  inStock: boolean;
  priceJmdCents: number;
  relevanceScore?: number;
}

// Generate test dataset
function generateTestData(count: number): LoadTestResult[] {
  const products: LoadTestResult[] = [];
  const brands = ["Grace", "Nestlé", "Lasco", "Walkerswood", "Jamaica Producers"];
  
  for (let i = 0; i < count; i++) {
    const brand = brands[i % brands.length];
    products.push({
      product: {
        $id: `product_${i}`,
        title: `${brand} Product ${i}`,
        sku: `SKU_${i}`,
        brand,
        category_leaf_id: `cat_${i % 5}`,
        category_path_ids: [`cat_${i % 5}`],
      },
      brand,
      category: {
        $id: `cat_${i % 5}`,
        name: `Category ${i % 5}`,
      },
      inStock: i % 3 !== 0,
      priceJmdCents: Math.floor(Math.random() * 100000) + 1000,
    });
  }
  
  return products;
}

// Simulate a user search session
async function simulateUserSession(
  userId: number,
  products: LoadTestResult[],
  queriesPerUser: number
): Promise<{ totalTime: number; errors: number }> {
  const queries = [
    "grace",
    "corned beef",
    "lasco food drink",
    "walkerswood jerk",
    "nestlé milk",
    "jamaica producers",
    "product",
    "beverage",
    "snack",
    "sauce",
  ];
  
  const sortModes: SortMode[] = ["relevance", "price_asc", "price_desc"];
  
  let totalTime = 0;
  let errors = 0;
  
  for (let i = 0; i < queriesPerUser; i++) {
    const query = queries[i % queries.length];
    const sortMode = sortModes[i % sortModes.length];
    
    try {
      const start = performance.now();
      
      // Simulate filtering
      const filtered = products.filter(p => 
        p.inStock && p.priceJmdCents >= 5000 && p.priceJmdCents <= 50000
      );
      
      // Apply ranking and sorting
      rankResults(filtered, query, undefined, sortMode);
      
      const end = performance.now();
      totalTime += (end - start);
    } catch (error) {
      errors++;
    }
  }
  
  return { totalTime, errors };
}

// Run concurrent load test
async function runLoadTest(
  concurrentUsers: number,
  queriesPerUser: number,
  products: LoadTestResult[]
): Promise<{
  totalQueries: number;
  totalTime: number;
  avgTimePerQuery: number;
  errors: number;
  queriesPerSecond: number;
}> {
  const startTime = performance.now();
  
  // Simulate concurrent users
  const userPromises = [];
  for (let i = 0; i < concurrentUsers; i++) {
    userPromises.push(simulateUserSession(i, products, queriesPerUser));
  }
  
  const results = await Promise.all(userPromises);
  
  const endTime = performance.now();
  const totalTime = endTime - startTime;
  
  const totalQueries = concurrentUsers * queriesPerUser;
  const errors = results.reduce((sum, r) => sum + r.errors, 0);
  const avgTimePerQuery = totalTime / totalQueries;
  const queriesPerSecond = (totalQueries / totalTime) * 1000;
  
  return {
    totalQueries,
    totalTime,
    avgTimePerQuery,
    errors,
    queriesPerSecond,
  };
}

// Main test execution
async function runTests() {
  console.log("\n=== Search Load Testing ===\n");
  console.log(`Dataset size: ${DATASET_SIZE.toLocaleString()} products`);
  console.log(`Queries per user: ${QUERIES_PER_USER}`);
  console.log(`Testing with concurrent users: ${CONCURRENT_USERS.join(", ")}\n`);
  
  const products = generateTestData(DATASET_SIZE);
  
  console.log("Load Test Results:");
  console.log("-".repeat(80));
  console.log(
    "Users".padEnd(10) +
    "Queries".padEnd(12) +
    "Total Time".padEnd(15) +
    "Avg/Query".padEnd(15) +
    "QPS".padEnd(10) +
    "Errors"
  );
  console.log("-".repeat(80));
  
  const results: any[] = [];
  
  for (const users of CONCURRENT_USERS) {
    const result = await runLoadTest(users, QUERIES_PER_USER, products);
    results.push({ users, ...result });
    
    console.log(
      `${users}`.padEnd(10) +
      `${result.totalQueries}`.padEnd(12) +
      `${result.totalTime.toFixed(0)}ms`.padEnd(15) +
      `${result.avgTimePerQuery.toFixed(2)}ms`.padEnd(15) +
      `${result.queriesPerSecond.toFixed(1)}`.padEnd(10) +
      `${result.errors}`
    );
  }
  
  console.log("-".repeat(80));
  console.log("\nPerformance Analysis:");
  console.log("-".repeat(80));
  
  // Check for performance degradation
  const baselineQPS = results[0].queriesPerSecond;
  const maxLoadQPS = results[results.length - 1].queriesPerSecond;
  const degradation = ((baselineQPS - maxLoadQPS) / baselineQPS) * 100;
  
  console.log(`\nBaseline QPS (${CONCURRENT_USERS[0]} user): ${baselineQPS.toFixed(1)}`);
  console.log(`Max Load QPS (${CONCURRENT_USERS[CONCURRENT_USERS.length - 1]} users): ${maxLoadQPS.toFixed(1)}`);
  console.log(`Performance degradation: ${degradation.toFixed(1)}%`);
  
  if (degradation > 50) {
    console.log("\n⚠️  WARNING: Significant performance degradation under load");
    console.log("   Consider optimizing query execution or adding caching");
  } else if (degradation > 25) {
    console.log("\n⚠️  CAUTION: Moderate performance degradation detected");
    console.log("   Monitor real-world performance closely");
  } else {
    console.log("\n✓ PASS: Queries remain stable under load");
  }
  
  // Check for errors
  const totalErrors = results.reduce((sum, r) => sum + r.errors, 0);
  if (totalErrors > 0) {
    console.log(`\n❌ FAIL: ${totalErrors} errors occurred during load test`);
  } else {
    console.log("✓ PASS: No errors during load test");
  }
  
  // Check average query time
  const avgQueryTime = results.reduce((sum, r) => sum + r.avgTimePerQuery, 0) / results.length;
  console.log(`\nAverage query time across all loads: ${avgQueryTime.toFixed(2)}ms`);
  
  if (avgQueryTime > 100) {
    console.log("⚠️  WARNING: Average query time exceeds 100ms");
  } else if (avgQueryTime > 50) {
    console.log("⚠️  CAUTION: Average query time is above optimal (> 50ms)");
  } else {
    console.log("✓ PASS: Average query time is excellent (< 50ms)");
  }
  
  console.log("\n=== Load Test Complete ===\n");
  
  console.log("Summary:");
  console.log(`  - Total queries executed: ${results.reduce((sum, r) => sum + r.totalQueries, 0)}`);
  console.log(`  - Total errors: ${totalErrors}`);
  console.log(`  - System stability: ${degradation < 25 ? "Excellent" : degradation < 50 ? "Good" : "Needs Improvement"}`);
  console.log("\nRecommendations:");
  
  if (avgQueryTime < 50 && degradation < 25 && totalErrors === 0) {
    console.log("  ✓ System is well-optimized for current load");
    console.log("  ✓ Can handle concurrent users effectively");
    console.log("  - Continue monitoring with real production traffic");
  } else {
    console.log("  - Consider implementing query caching for common searches");
    console.log("  - Monitor database query performance");
    console.log("  - Implement rate limiting for API protection");
    if (avgQueryTime > 50) {
      console.log("  - Optimize ranking algorithm for better performance");
    }
    if (degradation > 25) {
      console.log("  - Consider horizontal scaling for high-concurrency scenarios");
    }
  }
  
  console.log("");
}

// Run the tests
runTests().catch(console.error);
