CREATE TABLE "login" (
    id SERIAL PRIMARY KEY,
    provider VARCHAR(80) NOT NULL,
    password VARCHAR(1000) NOT NULL,
    user_id INT REFERENCES "user"
);

CREATE TABLE "user" (
    id SERIAL PRIMARY KEY,
    display_name VARCHAR(80),
    first_name VARCHAR(80),
    last_name VARCHAR(80),
    email VARCHAR(120) UNIQUE,
    picture VARCHAR(1200)
);
