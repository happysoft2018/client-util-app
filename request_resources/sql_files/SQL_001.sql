
SELECT p.*
FROM products p
WHERE price >= @min_price
and price <= @max_price;

