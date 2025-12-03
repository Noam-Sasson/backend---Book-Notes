--create--
CREATE TABLE bookList (
    id SERIAL PRIMARY KEY,
    title VARCHAR(1000) NOT NULL,
    note TEXT,
    rating INT,
    readDate TIMESTAMP
);