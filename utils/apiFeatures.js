class APIFeatures {
  constructor(query, queryString) {
    this.query = query;
    this.queryString = queryString;
  }

  filter() {
    const queryObj = { ...this.queryString }; //Create object copy of req.query
    const excludedFields = ['page', 'sort', 'limit', 'fields']; //Fields that you do not want to include in the query
    excludedFields.forEach((el) => delete queryObj[el]); //Remove fields from copy of req.query

    //1B) Advanced filtering
    let queryStr = JSON.stringify(queryObj); //Parse object to string
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`); //Reemplazar los operadores de comparacion por los de mongodb

    this.query = this.query.find(JSON.parse(queryStr));
    //let query = Tour.find(JSON.parse(queryStr)); //Most similar way to mongodb queries

    return this;
  }

  sort() {
    if (this.queryString.sort) {
      const sortBy = this.queryString.sort.split(',').join(' ');
      this.query = this.query.sort(sortBy);
    } else {
      this.query = this.query.sort('-createdAt name');
    }
    return this;
  }

  limitFields() {
    if (this.queryString.fields) {
      const fields = this.queryString.fields.split(',').join(' ');
      this.query = this.query.select(fields);
    } else {
      //- : Excluir
      this.query = this.query.select('-__v');
    }
    return this;
  }
  paginate() {
    const page = this.queryString.page * 1 || 1; //If page is not specified, page 1 is taken
    const limit = this.queryString.limit * 1 || 100; //If no limit is specified, 100 is taken
    const skip = (page - 1) * limit; //Number of documents to skip

    this.query = this.query.skip(skip).limit(limit);
    return this;
  }
}

module.exports = APIFeatures;
