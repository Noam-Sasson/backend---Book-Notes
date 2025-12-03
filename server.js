import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import fs from "fs";

const app = express();
const PORT = 3001;

const DB_PORT = 5432

app.use(bodyParser.urlencoded({ extended: true }));

const db = new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "bookNotes",
  password: "[REMOVED]",
  port: DB_PORT,
});

db.connect();

async function getTopNRecords(res, limit, sortByCol = "id"){
    try{
        const books =  limit ? await db.query(`SELECT * \
                                FROM bookList\
                                ORDER BY ${sortByCol}\
                                LIMIT $1`,[limit])
                                :
                                await db.query(`SELECT * \
                                FROM bookList\
                                ORDER BY ${sortByCol}\
                                LIMIT ALL`)
        
        console.log(`Fetched seccessfully`);
        console.log(books.rows)
        res.json({data:books.rows})
        
    }
    catch(error){
        console.log(`Failed to fetch data from database, details: ${error}`);
        res.status(400).json({
            error: "Failed to fetch data from database",
            details: error.message,
            data:[]
        });
    }
    
}

async function addNewRecord(res, title, note =null, rating = null, readDate = null){

    const query_items = {'title':title, 'note':note, 'rating':rating, 'readDate':readDate}
    let query = 'INSERT INTO bookList ('
    let values = 'VALUES ('
    let values_arr = []
    let i=1
    for(const key in query_items){
        if(query_items[key]){
            values += `$${i++},`
            values_arr.push(query_items[key])
        }
        else{
            query_items[key] = null
            values += `NULL,`
        }
        query += `${key},`
    }
    query = query.slice(0, -1) + ') '
    values = values.slice(0, -1) + ') '
    query += values + 'RETURNING id'

    console.log(query)
    
    try{
        const result =  await db.query(query, values_arr);
        const bookId =  result.rows[0].id
        
        console.log("New record added successfully with id " + bookId)
        res.json({id: bookId})
    }catch(error){
        console.log(`Failed to add record to database, details: ${error}`);
        res.status(500).json({
            error: "Failed to add record to database",
            details: error.message,
            id: -1
        });
    }
}

async function patchExistingRecord(res, id, title=null, note =null, rating = null, readDate = null){
    const query_items = {'id':id, 'title':title, 'note':note, 'rating':rating, 'readDate':readDate}
    let query = 'UPDATE bookList '
    let values = 'SET '
    let where = 'WHERE id = $1 '
    let returning = 'RETURNING '
    let values_arr = []
    let i=1
    for(const key in query_items){
        if(query_items[key]){
            values += `${key} = $${i++},`
            returning += `${key},`
            values_arr.push(query_items[key])
        }
        else{
            query_items[key] = null
        }
    }
    values = values.slice(0, -1) + ' '
    returning = returning.slice(0, -1)
    query += values + where + returning

    console.log(query)
    
    try{
        const result =  await db.query(query, values_arr);
        const updatedValues =  result.rows[0]
        
        console.log("Record updated successfully with values " + JSON.stringify(updatedValues))
        res.json({updatedValues: updatedValues})
    }catch(error){
        console.log(`Failed to updated record, details: ${error}`);
        res.status(500).json({
            error: "Failed to updated record",
            details: error.message,
            id: -1
        });
    }
}

async function deleteRecord(res, id){
    try{
        const result =  await db.query(`DELETE FROM bookList \
                                WHERE id = $1 RETURNING *`, [id]);
        console.log(`Record with id ${id} deleted successfully`);
        res.json({deletedRecord: result.rows[0]})
    }catch(error){
        console.log(`Failed to delete record, details: ${error}`);
        res.status(500).json({
            error: "Failed to delete record",
            details: error.message,
            id: -1
        });
    }
}

app.get("/top", async (req, res) => {
    //gets an http containing
    // - limit (optional): if not mention returns all 
    // - orderBy (optional): if not mentioned sorts by id

    const limit =req.query.limit
    const sortByCol = req.query.orderBy
    console.log("processing")
    await getTopNRecords(res, limit, sortByCol)
});

app.post("/add", async (req, res) => {
    //gets an http containing
    // - title: title of the book
    // - note (optional):
    // - rating (optional):
    // - date (optional):

    const title = req.query.title
    const note = req.query.note
    const rating = req.query.rating
    const readDate = req.query.date

    await addNewRecord(res, title, note, rating, readDate)
});

app.patch("/update/:id", async (req, res) => {
    // gets an http containing
    // - id: id of the book to update
    // - title (optional): new title of the book
    // - note (optional): new note
    // - rating (optional): new rating
    // - date (optional): new read date

    const id = req.params.id
    const title = req.query.title
    const note = req.query.note
    const rating = req.query.rating
    const readDate = req.query.date

    await patchExistingRecord(res, id, title, note, rating, readDate)
    // res.status(500)

});

app.delete("/delete", async (req, res) => {
    // gets an http containing
    // - id: id of the book to delete
    const id = req.query.id

    await deleteRecord(res, id)
});

app.listen(PORT, () => {
  console.log(`Successfully started server on port ${PORT}.`);
});