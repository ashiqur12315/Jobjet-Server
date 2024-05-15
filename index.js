const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken')
const cookieParser = require('cookie-parser')
const app = express();
require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.PORT || 5000;

//middleware
app.use(cors({
    origin: ['http://localhost:5173', 'https://a-11-job-marketplace.web.app', 'https://a-11-job-marketplace.firebaseapp.com'],
    credentials: true
}));
app.use(express.json());
app.use(cookieParser())

// Our middleware

const verifyToken = async(req, res, next)=>{
  const token = req.cookies?.token;
  // console.log('token in the middle ware', token)
  if(!token){
    return res.status(401).send({message: 'unauthorized access'})
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded)=>{
    if(err){
      return res.status(401).send({message: 'unauthorized access'})
    }
    req.user = decoded
    console.log(decoded)
    next()
  })

}




const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster1.hauko36.mongodb.net/?retryWrites=true&w=majority&appName=Cluster1`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
  };

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        // await client.connect();

        


        // auth related api
        app.post('/jwt', async(req, res)=>{
          const user = req.body;
          console.log('user for token', user)

          const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {expiresIn: '10h'})

          res
          .cookie('token', token, cookieOptions)
          .send({success: true})
        })

        // clear cookie 
        app.post('/logout', async(req, res)=>{
            res
            .clearCookie('token', {...cookieOptions, maxAge: 0,
          })
          .send({success: true})
        })

        // /////////////////////Job MArketplace/////////////////////////////////////////////////////////////////////
        const jobCOllection = client.db('JobWorkplace').collection('allJob')
        const appliedJobCOllection = client.db('JobWorkplace').collection('appliedJobs')

        // all job details
        app.get('/jobs', async (req, res) => {
            const result = await jobCOllection.find().toArray()
            // console.log(result)
            res.send(result)
        })

        // single job details
        app.get('/singleJob/:id', async (req, res) => {
            const id = req.params.id;
            const result = await jobCOllection.findOne({ _id: new ObjectId(id) })
            res.send(result)
        })

        //add a job in db
        app.post('/add-job', async (req, res) => {
            const job = req.body;
            const result = await jobCOllection.insertOne(job);
            res.send(result)
        })

        //my jobs
        app.get('/my-jobs/:email',verifyToken, async (req, res) => {
            const email = req.params.email;
            // console.log(typeof email,typeof req.user.email)
            if(req.user.email !== req.params.email){
                return res.status(403).json({message: 'forbidden access'})
              }
            //   else{
            //     const result = await jobCOllection.find({ employer_email: email }).toArray()
            //     res.status(200).json(result)
            // // res.send(result)
            //   }
            
            const result = await jobCOllection.find({ employer_email: email }).toArray()
            res.send(result)
        })

        //add applied job application
        app.post('/applied-jobs', async (req, res) => {
            const job = req.body;
            const result = await appliedJobCOllection.insertOne(job);
            res.send(result)
        })

        //update a job
        
        app.patch('/update/:id', async (req, res) => {
            const id = req.params.id;
            const jobInfo = req.body;
            console.log(req.body)
            const query = { _id: new ObjectId(id) }
            console.log(jobInfo)
            const updateDoc = {
                $set: jobInfo
            }
            const result = await jobCOllection.updateOne(query, updateDoc)
            res.send(result)
        })

        //update a job count of job applicants
        app.patch('/job-count/:id', async (req, res) => {
            const id = req.params.id;
            // const jobInfo = req.body;
            // console.log(id, jobInfo)

            const result = await jobCOllection.updateOne({ _id: new ObjectId(id) }, {
                $inc: { job_applicants_number: 1 } // Increment by 1
              })
            // const query = { _id: new ObjectId(id) }
            // const updateDoc = {
            //     $set: jobInfo
            // }
            // const result = await jobCOllection.updateOne(query, updateDoc)
            res.send(result)
        })

        //delete a job
        app.delete('/delete/:id', async (req, res) => {
            const id = req.params.id;
            // console.log(id)
            const query = { _id: new ObjectId(id) }
            const result = await jobCOllection.deleteOne(query)
            res.send(result)
        })

        // get all applied jobs data 
        app.get('/appliedJobs/:email',verifyToken, async (req, res) => {
            const email = req.params.email;
            if(req.user.email !== req.params.email){
                return res.status(403).json({message: 'forbidden access'})
              }
            const result = await appliedJobCOllection.find({ applicant_email: email }).toArray()
            // console.log(result)
            res.send(result)
        })

        //search job
        app.get('/search-job', async(req, res)=>{
            const search = req.query.search;
            let query = { job_title: {$regex: search, $options: 'i'}}
            const result = await jobCOllection.find(query).toArray()
            res.send(result)
        })






        ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


        

        // app.post('/logout', async(req, res)=>{
        //   const user = req.body;
        //   console.log('logging out', user)
        //   res
        //   .clearCookie('token',{maxAge: 0})
        //   .send({success: true})
        // })
        // app.post('/jwt', (req, res) => {
        //   const user = req.body;
        //   console.log(user)
        //   const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
        //   res
        //   .cookie('token', token, {
        //     httpOnly: true,
        //     secure: true,
        //     sameSite: 'none'
        //   })
        //   .send({success: true})
        // })


       



        // Send a ping to confirm a successful connection
        // await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('job workplace is running')
})
app.listen(port, () => {
    console.log(`job workplace server is running on port ${port}`)
})