import axios from 'axios';
import { createObjectCsvWriter } from 'csv-writer';
import fs from 'fs';

interface Job {
    Id: string;
    Title: string;
    JobCategoryName: string;
    Locations: {
        Address: {
            City: string;
            State: { Name: string };
            PostalCode: string;
            Country: { Name: string };
        };
    }[];
    PostedDate: string;
    BriefDescription: string;
    JobLocationType: number | null;
}

interface ApiResponse {
    opportunities: Job[];
    totalCount: number;
}

async function fetchJobData(apiUrl: string): Promise<ApiResponse> {
    try {
        const getTotalCountResponse = await axios({
            url: apiUrl,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            data: {
                opportunitySearch: {}
            }
        });

        const { totalCount } = getTotalCountResponse.data;

        if (!totalCount) {
            throw new Error('No jobs found');
        }

        const response = await axios({
            url: apiUrl,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            data: {
                opportunitySearch: {
                    "Top": totalCount
                }
            }
        });

        return response.data;
    } catch (error) {
        throw new Error(`Error fetching job data: ${error.message}`);
    }
}

function processJobData(jobs: Job[]): any[] {
    return jobs.map(job => ({
        title: job.Title,
        category: job.JobCategoryName,
        jobID: job.Id,
        schedule: job.JobLocationType === 1 ? 'Full-time' : 'Other',
        locationType: job.JobLocationType === 1 ? 'On-site' : 'Other',
        address: job.Locations[0]?.Address.Line1 || '',
        city: job.Locations[0]?.Address.City || '',
        state: job.Locations[0]?.Address.State.Name || '',
        zipcode: job.Locations[0]?.Address.PostalCode || '',
        country: job.Locations[0]?.Address.Country.Name || '',
        description: job.BriefDescription,
        datePosted: job.PostedDate
    }));
}

async function main() {
    const apiUrl = process.env.API_URL;
    const logFilePath = process.env.LOG_FILE_PATH;
    const outputFilePath = process.env.OUTPUT_FILE_PATH;

    if (!apiUrl || !logFilePath || !outputFilePath) {
        throw new Error('Missing required environment variables');
    }

    try {
        const jobData = await fetchJobData(apiUrl);
        const processedData = processJobData(jobData.opportunities);

        const csvWriter = createObjectCsvWriter({
            path: outputFilePath,
            header: [
                { id: 'title', title: 'Title' },
                { id: 'category', title: 'Category' },
                { id: 'jobID', title: 'Job ID' },
                { id: 'schedule', title: 'Schedule' },
                { id: 'locationType', title: 'Location Type' },
                { id: 'address', title: 'Address' },
                { id: 'city', title: 'City' },
                { id: 'state', title: 'State' },
                { id: 'zipcode', title: 'Zipcode' },
                { id: 'country', title: 'Country' },
                { id: 'description', title: 'Description' },
                { id: 'datePosted', title: 'Date Posted' }
            ]
        });

        await csvWriter.writeRecords(processedData);
        console.log(`CSV file has been written successfully to ${outputFilePath}`);

        // Log success
        fs.appendFileSync(logFilePath, `${new Date().toISOString()} - Job data processed successfully\n`);
    } catch (error) {
        console.error('An error occurred:', error.message);
        // Log error
        fs.appendFileSync(logFilePath, `${new Date().toISOString()} - Error: ${error.message}\n`);
    }
}

main();